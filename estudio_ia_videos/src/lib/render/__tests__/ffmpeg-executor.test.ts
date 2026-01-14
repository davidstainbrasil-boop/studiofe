
import { FFmpegExecutor, FFmpegOptions } from '../ffmpeg-executor';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn()
}));

// Mock logger
jest.mock('@lib/logger', () => {
    const mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    };
    return {
        Logger: jest.fn(() => mockLogger),
        logger: mockLogger
    };
}, { virtual: true });

// Mock fs
jest.mock('fs', () => ({
    promises: {
        rename: jest.fn(),
        stat: jest.fn().mockResolvedValue({ size: 1024 }),
        unlink: jest.fn(),
        access: jest.fn().mockResolvedValue(undefined),
        readdir: jest.fn().mockResolvedValue(['frame_001.png', 'frame_002.png']),
        mkdir: jest.fn()
    }
}));

describe('FFmpegExecutor', () => {
    let executor: FFmpegExecutor;
    const mockSpawn = spawn as unknown as jest.Mock;

    beforeEach(() => {
        executor = new FFmpegExecutor();
        jest.clearAllMocks();
    });

    it('should render video from frames successfully', async () => {
        // Arrange
        const mockChildProcess = new EventEmitter();
        (mockChildProcess as any).stdout = new EventEmitter();
        (mockChildProcess as any).stderr = new EventEmitter();
        
        mockSpawn.mockReturnValue(mockChildProcess);

        const options: FFmpegOptions = {
            inputFramesDir: '/tmp/frames',
            outputPath: '/tmp/output.mp4',
            fps: 30,
            width: 1920,
            height: 1080
        };
        
        // Act
        const renderPromise = executor.renderFromFrames(options);

        // Emit success
        setTimeout(() => {
            mockChildProcess.emit('close', 0);
        }, 10);

        const result = await renderPromise;

        // Assert
        expect(result.success).toBe(true);
        expect(mockSpawn).toHaveBeenCalledWith('ffmpeg', expect.arrayContaining([
            '-framerate', '30',
            '-i', expect.stringContaining('/tmp/frames'),
            '-s', '1920x1080',
            '/tmp/output.mp4.tmp.mp4' // Temp output path used in code
        ]));
        expect(fs.rename).toHaveBeenCalledWith('/tmp/output.mp4.tmp.mp4', '/tmp/output.mp4');
    });

    it('should handle process failure', async () => {
        // Arrange
        const mockChildProcess = new EventEmitter();
        (mockChildProcess as any).stdout = new EventEmitter();
        (mockChildProcess as any).stderr = new EventEmitter();
        
        mockSpawn.mockReturnValue(mockChildProcess);

        const options: FFmpegOptions = {
            inputFramesDir: '/tmp/frames',
            outputPath: '/tmp/fail.mp4'
        };
        
        // Act
        const renderPromise = executor.renderFromFrames(options);

        // Emit failure
        setTimeout(() => {
            mockChildProcess.emit('error', new Error('Spawn failed'));
        }, 10);

        const result = await renderPromise;

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Spawn failed');
    });

    it('should handle non-zero exit code', async () => {
         // Arrange
         const mockChildProcess = new EventEmitter();
         (mockChildProcess as any).stdout = new EventEmitter();
         (mockChildProcess as any).stderr = new EventEmitter();
         
         mockSpawn.mockReturnValue(mockChildProcess);
 
         const options: FFmpegOptions = {
            inputFramesDir: '/tmp/frames',
            outputPath: '/tmp/error.mp4'
        };
         
         // Act
         const renderPromise = executor.renderFromFrames(options);
 
         // Emit non-zero exit
         setTimeout(() => {
             mockChildProcess.emit('close', 1);
         }, 10);
 
         const result = await renderPromise;

         // Assert
         expect(result.success).toBe(false);
         expect(result.error).toContain('FFmpeg falhou com código 1');
    });
});
