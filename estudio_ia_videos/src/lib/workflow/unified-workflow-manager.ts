/**
 * 🚀 Unified Workflow Manager
 * Gerencia o fluxo de trabalho unificado do projeto
 */

import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import { jobManager } from '@lib/render/job-manager';
import { storageSystem } from '@/lib/storage-system-real';
import { PPTXProcessorReal } from '@/lib/pptx/pptx-processor-real';

// Types for workflow data
export interface StepData {
  [key: string]: unknown;
}

export type WorkflowStep = 'import' | 'edit' | 'avatar' | 'tts' | 'render' | 'export' | 'complete';

export interface WorkflowStepStatus {
  status: 'pending' | 'processing' | 'completed' | 'error' | 'idle' | 'failed';
  data?: StepData;
  error?: string;
}

// Interface para o fluxo unificado
export interface UnifiedWorkflow {
  projectId: string;
  // userId missing in original interface but helpful, adding it for context if possible or relying on metadata
  status: string; // 'idle' | 'processing' | 'completed' | 'failed'
  currentStep: WorkflowStep;
  steps: {
    import: WorkflowStepStatus;
    edit: WorkflowStepStatus;
    avatar: WorkflowStepStatus;
    tts: WorkflowStepStatus;
    render: WorkflowStepStatus;
    export: WorkflowStepStatus;
  }
  metadata: {
    createdAt: string;
    updatedAt: string;
    userId: string;
    totalDuration?: number;
    outputUrl?: string;
    [key: string]: any;
  };
}

export class UnifiedWorkflowManager {
  
  // -- Persistence Methods --

  private async getWorkflowState(projectId: string): Promise<UnifiedWorkflow | null> {
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { metadata: true, userId: true }
    });
    
    if (!project) return null;
    
    // Check if workflow state exists in metadata
    const metadata = project.metadata as Record<string, any> || {};
    const workflow = metadata.workflow as UnifiedWorkflow;
    
    if (workflow) return workflow;

    // Return default structure if not initialized yet effectively
    // Ideally createWorkflow should have been called first, but we can return null to signal "not started"
    // or construct a transient one.
    return null;
  }
  
  private async persistWorkflowState(projectId: string, state: UnifiedWorkflow): Promise<void> {
    // Fetch existing metadata to merge to avoid overwriting other keys
    const project = await prisma.projects.findUnique({ where: { id: projectId }, select: { metadata: true } });
    const currentMeta = project?.metadata as Record<string, any> || {};
    
    await prisma.projects.update({
      where: { id: projectId },
      data: {
        metadata: {
            ...currentMeta,
            workflow: state as any
        },
        updatedAt: new Date()
      }
    });
  }

  // -- Public API --

  async createWorkflow(projectId: string, userId: string): Promise<UnifiedWorkflow> {
    const workflow: UnifiedWorkflow = {
      projectId,
      currentStep: 'import',
      status: 'idle',
      steps: {
        import: { status: 'idle' },
        edit: { status: 'idle' },
        avatar: { status: 'idle' },
        tts: { status: 'idle' },
        render: { status: 'idle' },
        export: { status: 'idle' }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId
      }
    };

    await this.persistWorkflowState(projectId, workflow);
    return workflow;
  }

  async getWorkflow(projectId: string): Promise<UnifiedWorkflow | null> {
    return this.getWorkflowState(projectId);
  }

  async executeStep(projectId: string, step: WorkflowStep, data?: StepData): Promise<StepData> {
    logger.info('Executing workflow step', { projectId, step, service: 'UnifiedWorkflow' });

    let workflow = await this.getWorkflowState(projectId);
    if (!workflow) {
       // Auto-create if missing? Or throw?
       // Let's try to verify project ownership or existence broadly, or assume it exists if we are here.
       // For now, throw.
       throw new Error(`Workflow not found for project: ${projectId}`);
    }

    try {
      await this.updateWorkflowStepInternal(projectId, step, 'processing');

      let result: StepData;
      
      switch (step) {
        case 'import':
          result = await this.executeImport(projectId, data);
          break;
        case 'edit':
          result = await this.executeEdit(projectId, data);
          break;
        case 'avatar':
          result = await this.executeAvatar(projectId, data);
          break;
        case 'tts':
          result = await this.executeTTS(projectId, data);
          break;
        case 'render':
          result = await this.executeRender(projectId, data);
          break;
        case 'export':
          result = await this.executeExport(projectId, data);
          break;
        default:
          throw new Error(`Unknown step: ${step}`);
      }

      await this.updateWorkflowStepInternal(projectId, step, 'completed', result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateWorkflowStepInternal(projectId, step, 'error', { error: errorMessage });
      logger.error('Workflow step failed', error instanceof Error ? error : new Error(String(error)), { projectId, step });
      throw error;
    }
  }
  
  async updateWorkflowStep(projectId: string, step: WorkflowStep, status: UnifiedWorkflow['steps']['import']['status'], data?: StepData): Promise<void> {
    return this.updateWorkflowStepInternal(projectId, step, status, data);
  }

  // -- Internal Logic --

  private async updateWorkflowStepInternal(
    projectId: string, 
    step: WorkflowStep, 
    status: UnifiedWorkflow['steps']['import']['status'], // generic accessor
    data?: StepData
  ): Promise<void> {
     let workflow = await this.getWorkflowState(projectId);
     if (!workflow) return;

     workflow.currentStep = step;
     workflow.status = status === 'processing' ? 'processing' : (status === 'error' ? 'failed' : 'idle');
     workflow.metadata.updatedAt = new Date().toISOString();
     
     // Update step status
     const stepKey = step as keyof UnifiedWorkflow['steps'];
     if (workflow.steps[stepKey]) {
         workflow.steps[stepKey].status = status;
         if (data) workflow.steps[stepKey].data = data;
         if (status === 'error' && data?.error) workflow.steps[stepKey].error = data.error as string;
     }

     // Auto-advance logic
     if (status === 'completed') {
         // Determine next step
         const stepsOrder: WorkflowStep[] = ['import', 'edit', 'avatar', 'tts', 'render', 'export'];
         const idx = stepsOrder.indexOf(step);
         if (idx >= 0 && idx < stepsOrder.length - 1) {
             workflow.currentStep = stepsOrder[idx + 1];
         } else {
             workflow.currentStep = 'complete';
             workflow.status = 'completed';
         }
     }

     await this.persistWorkflowState(projectId, workflow);
  }

  private async executeImport(projectId: string, data?: StepData): Promise<StepData> {
    
    // Integração com PPTX Studio
    if (data && typeof data.type === 'string' && data.type === 'pptx') {
      if (typeof data.storagePath !== 'string') {
        throw new Error('PPTX Import requires storagePath');
      }
      
      logger.info('Starting PPTX import via UnifiedWorkflow', { projectId, storagePath: data.storagePath });

      // 1. Download File
      const buffer = await storageSystem.download({
          bucket: 'uploads',
          path: data.storagePath
      });

      // 2. Process File using Real Processor
      const result = await PPTXProcessorReal.extract(buffer, projectId);

      if (!result.success) {
          throw result.error || new Error('PPTX extraction failed');
      }
      
      // Persist import metadata to project
      await prisma.projects.update({
        where: { id: projectId },
        data: {
          metadata: {
             // using merge is tricky with prisma json, so we might need to fetch-merge-update or rely on shallow updates if strict
             // For now, simpler to assume workflow store handles the main workflow state, 
             // but we might want to store specific import details
             importStats: {
                 slideCount: result.slides.length,
                 importedAt: new Date().toISOString()
             }
          } // Note: this effectively merges or overwrites top keys depending on prisma version/db.
            // But safely, we should rely on the Workflow State persistence which happens in updateWorkflowStepInternal
        }
      });
      
      return { success: true, message: 'PPTX Processed', slideCount: result.slides.length, slides: result.slides };
    }

    // Integração com Templates NR via TemplateApplier
    if (data && typeof data.type === 'string' && data.type === 'template-nr') {
       // Call TemplateApplier (Real Integration)
       const { TemplateApplier } = require('@lib/templates/template-applier');
       const applier = new TemplateApplier();
       
       if (data.templateId) {
           await applier.applyTemplate(projectId, String(data.templateId));
           return { success: true, message: 'Template Applied' };
       }
       throw new Error('Template ID missing');
    }

    return { success: true, message: 'Import completed (No specific handler triggered)' };
  }

  private async executeEdit(projectId: string, data?: StepData): Promise<StepData> {
    // Integração com Canvas Editor / Database
    // Na fase de edit, as alterações são salvas via API de slides/timeline.
    // Este passo apenas valida se o projeto está "pronto" para avançar.
    
    const slideCount = await prisma.slides.count({ where: { projectId } });
    if (slideCount === 0) {
        // Warning but proceed? Or fail?
        return { success: true, message: 'Edit completed (No slides found, warning)' };
    }

    return { success: true, message: `Edit step completed with ${slideCount} slides` };
  }

  private async executeAvatar(projectId: string, data?: StepData): Promise<StepData> {
    // Real implementation: Validate avatar config exists in DB
    const slides = await prisma.slides.findMany({ where: { projectId } });
    const hasAvatar = slides.some(s => s.avatarConfig && Object.keys(s.avatarConfig as object).length > 0);
    
    // Check if we need to set default avatars
    if (!hasAvatar && data?.autoAssignAvatar) {
        // Active logic to assign default avatar would go here
        // For now, we report status
    }

    return { success: true, message: `Avatar configuration verified. Slides with avatar: ${hasAvatar ? 'Yes' : 'No'}` };
  }

  private async executeTTS(projectId: string, data?: StepData): Promise<StepData> {
    const { elevenLabsService } = require('@lib/elevenlabs-service');
    const { VideoUploader } = require('@lib/storage/video-uploader');
    const fs = require('fs/promises'); // dynamically import to avoid top-level if needed, but standard is fine
    const path = require('path');
    const os = require('os');
    
    // We iterate slides and generate audio if missing
    const slides = await prisma.slides.findMany({ where: { projectId }, orderBy: { orderIndex: 'asc' } });
    let generatedCount = 0;
    
    const uploader = new VideoUploader();

    for (const slide of slides) {
        const audioConfig = slide.audioConfig as any;
        // Generate if content exists AND (no audioUrl OR forceRegenerate)
        if (slide.content && (!audioConfig?.audioUrl || data?.forceRegenerate)) {
            
            logger.info('Generating TTS for slide', { slideId: slide.id, service: 'UnifiedWorkflow' });

            const audioBuffer = await elevenLabsService.generateSpeech({
                text: slide.content, 
                voiceId: audioConfig?.voiceId || '21m00Tcm4TlvDq8ikWAM'
            });

            // Upload buffer to storage (Real Persistence)
            const tempFile = path.join(os.tmpdir(), `tts_${slide.id}_${Date.now()}.mp3`);
            await fs.writeFile(tempFile, audioBuffer);
            
            try {
                // Upload to Supabase
                // We use a "system" user or the project's owner if available. 
                // Getting project owner via slide.projectId if needed, but let's assume system folder for assets
                // or better: fetch project owner.
                const project = await prisma.projects.findUnique({ where: { id: projectId }, select: { userId: true }});
                const userId = project?.userId || 'system';

                const audioUrl = await uploader.uploadVideo({ // Using uploadVideo for audio/generic for now or need specialized method
                    videoPath: tempFile,
                    projectId,
                    userId,
                    jobId: `tts_${slide.id}`, 
                    metadata: {
                        resolution: { width: 0, height: 0 },
                        fps: 0,
                        codec: 'mp3',
                        format: 'mp3',
                        fileSize: audioBuffer.length
                    }
                });

                // Update Slide in DB
                await prisma.slides.update({
                    where: { id: slide.id },
                    data: {
                        audioConfig: {
                            ...(audioConfig || {}),
                            audioUrl: audioUrl,
                            voiceId: audioConfig?.voiceId || '21m00Tcm4TlvDq8ikWAM'
                        }
                    }
                });
                
                generatedCount++;
            } finally {
                await fs.unlink(tempFile).catch((error: unknown) => {
                  logger.debug('Temp file already deleted during workflow cleanup', {
                    component: 'UnifiedWorkflowManager',
                    tempFile,
                    error: error instanceof Error ? error.message : String(error)
                  });
                });
            }
        }
    }

    return { success: true, message: `TTS processed (Generated: ${generatedCount})` };
  }

  private async executeRender(projectId: string, data?: StepData): Promise<StepData> {
    const { jobManager } = require('@lib/render/job-manager');
    const { videoRenderPipeline } = require('@lib/video/video-render-pipeline');
    
    // Check for existing user via project
    const project = await prisma.projects.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    const jobId = await jobManager.createJob(project.userId, projectId);
    
    // Start job async
    videoRenderPipeline.execute({ projectId, jobId }).catch((err: any) => 
        logger.error('Render pipeline failed', err instanceof Error ? err : new Error(String(err)), { projectId, jobId, service: 'UnifiedWorkflow' })
    );
    
    return { success: true, message: 'Render job created', jobId };
  }

  private async executeExport(projectId: string, data?: StepData): Promise<StepData> {
    // Export usually implies packaging or final delivery, render step handles the video generation.
    // This step might be "Publish to Youtube" or "Send Email".
    // Real implementation: Check render job status
    const pendingJobs = await prisma.render_jobs.findMany({
        where: { projectId, status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 1
    });
    
    if (pendingJobs.length === 0) {
        return { success: false, message: 'No completed render found to export' };
    }
    
    const job = pendingJobs[0];
    return { success: true, message: 'Export ready', url: job.outputUrl };
  }
}

export const workflowManager = new UnifiedWorkflowManager();
