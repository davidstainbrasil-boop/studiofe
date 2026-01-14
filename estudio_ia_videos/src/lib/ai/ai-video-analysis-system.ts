/**
 * AI Video Analysis System - Real Implementation
 * Uses OpenAI Vision and FFmpeg for video analysis
 */
export class AIVideoAnalysisSystem {
  private static instance: AIVideoAnalysisSystem;
  
  private constructor() {}

  static getInstance(): AIVideoAnalysisSystem {
    if (!this.instance) {
      this.instance = new AIVideoAnalysisSystem();
    }
    return this.instance;
  }

  async analyzeVideo(videoId: string, videoPath: string, config?: Record<string, unknown>) {
    const { logger } = require('@lib/logger');
    logger.info('[AI Analysis] Starting analysis', { videoId, videoPath, service: 'AIVideoAnalysis' });
    
    try {
        const { OpenAI } = require('openai');
        const fs = require('fs/promises');
        const path = require('path');
        const { spawn } = require('child_process');

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // 1. Extract a frame (thumbnail)
        const framePath = `/tmp/${videoId}_analysis_frame.jpg`;
        await new Promise<void>((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-y',
                '-i', videoPath,
                '-ss', '00:00:01',
                '-vframes', '1',
                '-q:v', '2',
                framePath
            ]);
            ffmpeg.on('close', (code: number) => code === 0 ? resolve() : reject(new Error(`FFmpeg extraction failed code ${code}`)));
            ffmpeg.on('error', (err: Error) => reject(err));
        });

        // 2. Read frame
        const imageBuffer = await fs.readFile(framePath);
        const base64Image = imageBuffer.toString('base64');

        // 3. Call OpenAI Vision
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Analyze this video frame and provide a summary of the visual content, mood, and any text visible." },
                        {
                            type: "image_url",
                            image_url: {
                                "url": `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ],
                },
            ],
            max_tokens: 300,
        });

        // Cleanup
        await fs.unlink(framePath).catch(() => {});

        // Persist result
        const { prisma } = require('@lib/prisma');
        const analysisId = `analysis_${Date.now()}`;
        
        await prisma.analytics_events.create({
            data: {
                eventType: 'video_analysis',
                userId: 'system', // or get from config if available (context)
                eventData: {
                    analysisId,
                    videoId,
                    status: 'completed',
                    result: response.choices[0].message.content,
                    raw: response
                }
            }
        });

        return {
          id: analysisId,
          videoId,
          status: 'completed',
          result: response.choices[0].message.content,
          raw: response,
          createdAt: new Date().toISOString()
        };

    } catch (error) {
        const { logger } = require('@lib/logger');
        logger.error('[AI Analysis] Failed', error instanceof Error ? error : new Error(String(error)), { videoId, service: 'AIVideoAnalysis' });
        
        // Log failure as well
        try {
             const { prisma } = require('@lib/prisma');
             await prisma.analytics_events.create({
                data: {
                    eventType: 'video_analysis_failed',
                    eventData: {
                        videoId,
                        error: error instanceof Error ? error.message : 'Unknown object'
                    }
                }
             });
        } catch (e) { /* ignore secondary error */ }

        return {
            id: `analysis_${Date.now()}`,
            videoId,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            createdAt: new Date().toISOString()
        };
    }
  }

  async getAnalysis(id: string) {
    const { prisma } = require('@lib/prisma');
    
    // We look for the event with this analysisId inside its JSON data
    // Prisma JSON filtering:
    const event = await prisma.analytics_events.findFirst({
        where: {
            eventType: 'video_analysis',
            eventData: {
                path: ['analysisId'],
                equals: id
            }
        }
    });

    if (!event) {
        return null; // Or throw
    }
    
    const data = event.eventData as any;

    return {
      id: data.analysisId,
      videoId: data.videoId,
      status: data.status,
      progress: 100,
      results: { summary: data.result },
      error: null,
      createdAt: event.createdAt,
      completedAt: event.createdAt
    };
  }
}
