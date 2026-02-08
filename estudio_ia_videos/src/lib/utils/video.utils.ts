
/**
 * Video Processing Utilities
 * Helper functions for video manipulation using FFmpeg
 */

import { exec } from 'child_process'
import { logger } from '@/lib/logger';
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { createWriteStream } from 'fs'
import path from 'path'
import axios from 'axios'
import { pipeline } from 'stream/promises'

const execAsync = promisify(exec)

export class VideoUtils {
  /**
   * Download video from URL to local path
   */
  static async downloadVideo(url: string, outputPath?: string): Promise<string> {
    const output = outputPath || path.join('/tmp', `download_${Date.now()}.mp4`)
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    })

    await pipeline(response.data, createWriteStream(output))
    return output
  }

  /**
   * Extract audio from video file
   */
  static async extractAudio(
    videoPath: string,
    outputPath?: string
  ): Promise<string> {
    const output = outputPath || videoPath.replace(/\.[^.]+$/, '.mp3')
    
    await execAsync(
      `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -q:a 2 "${output}"`
    )
    
    return output
  }

  /**
   * Get video metadata (duration, resolution, fps)
   */
  static async getMetadata(videoPath: string): Promise<{
    duration: number
    width: number
    height: number
    fps: number
    codec: string
  }> {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate,codec_name -of json "${videoPath}"`
    )
    
    const data = JSON.parse(stdout)
    const stream = data.streams[0]
    const format = data.format
    
    // Parse frame rate
    const [num, den] = stream.r_frame_rate.split('/')
    const fps = parseInt(num) / parseInt(den)
    
    return {
      duration: parseFloat(format.duration),
      width: stream.width,
      height: stream.height,
      fps,
      codec: stream.codec_name
    }
  }

  /**
   * Extract a single frame from video at specified time
   */
  static async extractFrame(
    videoPath: string,
    timeInSeconds: number,
    outputPath?: string
  ): Promise<string> {
    const output = outputPath || `frame_${Date.now()}.jpg`
    
    await execAsync(
      `ffmpeg -ss ${timeInSeconds} -i "${videoPath}" -vframes 1 -q:v 2 "${output}"`
    )
    
    return output
  }

  /**
   * Extract video segment between start and end time
   */
  static async extractSegment(
    videoPath: string,
    startTime: number,
    endTime: number,
    outputPath?: string
  ): Promise<string> {
    const output = outputPath || `segment_${Date.now()}.mp4`
    const duration = endTime - startTime
    
    await execAsync(
      `ffmpeg -ss ${startTime} -i "${videoPath}" -t ${duration} -c copy "${output}"`
    )
    
    return output
  }

  /**
   * Resize video to specified resolution
   */
  static async resize(
    videoPath: string,
    width: number,
    height: number,
    outputPath?: string
  ): Promise<string> {
    const output = outputPath || videoPath.replace(/(\.[^.]+)$/, '_resized$1')
    
    await execAsync(
      `ffmpeg -i "${videoPath}" -vf scale=${width}:${height} -c:a copy "${output}"`
    )
    
    return output
  }

  /**
   * Change video FPS
   */
  static async changeFPS(
    videoPath: string,
    targetFPS: number,
    outputPath?: string
  ): Promise<string> {
    const output = outputPath || videoPath.replace(/(\.[^.]+)$/, `_${targetFPS}fps$1`)
    
    await execAsync(
      `ffmpeg -i "${videoPath}" -filter:v fps=${targetFPS} "${output}"`
    )
    
    return output
  }

  /**
   * Merge multiple videos
   */
  static async mergeVideos(
    videoPaths: string[],
    outputPath?: string
  ): Promise<string> {
    const output = outputPath || `merged_${Date.now()}.mp4`
    const listFile = `concat_list_${Date.now()}.txt`
    
    // Create concat list file
    const listContent = videoPaths.map(p => `file '${p}'`).join('\n')
    await writeFile(listFile, listContent)
    
    try {
      await execAsync(
        `ffmpeg -f concat -safe 0 -i "${listFile}" -c copy "${output}"`
      )
    } finally {
      await unlink(listFile)
    }
    
    return output
  }

  /**
   * Add audio to video
   */
  static async addAudio(
    videoPath: string,
    audioPath: string,
    outputPath?: string
  ): Promise<string> {
    const output = outputPath || videoPath.replace(/(\.[^.]+)$/, '_with_audio$1')
    
    await execAsync(
      `ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -strict experimental "${output}"`
    )
    
    return output
  }

  /**
   * Convert video format
   */
  static async convert(
    videoPath: string,
    format: 'mp4' | 'webm' | 'mov' | 'avi',
    outputPath?: string
  ): Promise<string> {
    const output = outputPath || videoPath.replace(/\.[^.]+$/, `.${format}`)
    
    let codec = ''
    switch (format) {
      case 'mp4':
        codec = '-c:v libx264 -c:a aac'
        break
      case 'webm':
        codec = '-c:v libvpx-vp9 -c:a libopus'
        break
      case 'mov':
        codec = '-c:v libx264 -c:a aac'
        break
      case 'avi':
        codec = '-c:v mpeg4 -c:a libmp3lame'
        break
    }
    
    await execAsync(
      `ffmpeg -i "${videoPath}" ${codec} "${output}"`
    )
    
    return output
  }

  /**
   * Generate video thumbnail
   */
  static async generateThumbnail(
    videoPath: string,
    timeInSeconds: number = 1,
    outputPath?: string
  ): Promise<string> {
    const output = outputPath || videoPath.replace(/\.[^.]+$/, '_thumb.jpg')
    
    await execAsync(
      `ffmpeg -ss ${timeInSeconds} -i "${videoPath}" -vframes 1 -vf scale=320:-1 "${output}"`
    )
    
    return output
  }

  /**
   * Apply video filter (e.g., brightness, contrast, saturation)
   */
  static async applyFilter(
    videoPath: string,
    filter: string,
    outputPath?: string
  ): Promise<string> {
    const output = outputPath || videoPath.replace(/(\.[^.]+)$/, '_filtered$1')
    
    await execAsync(
      `ffmpeg -i "${videoPath}" -vf "${filter}" -c:a copy "${output}"`
    )
    
    return output
  }

  /**
   * Save uploaded file temporarily
   */
  static async saveTemporaryFile(file: File): Promise<string> {
    const tempDir = '/tmp'
    const fileName = `${Date.now()}_${file.name}`
    const filePath = path.join(tempDir, fileName)
    
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)
    
    return filePath
  }

  /**
   * Clean up temporary file
   */
  static async cleanupFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath)
    } catch (error) {
      logger.error('Error cleaning up file:', error instanceof Error ? error : new Error(String(error)))
    }
  }
}
