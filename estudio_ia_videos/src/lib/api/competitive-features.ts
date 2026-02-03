/**
 * API Service Layer for competitive features
 * Centralized API calls with proper error handling and types
 */

import { logger } from '@/lib/logger';

const API_BASE = '/api';

// Generic fetch wrapper with error handling
async function apiFetch<T>(
    endpoint: string,
    options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return { data, error: null };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error('API Error', new Error(message), { endpoint });
        return { data: null, error: message };
    }
}

// ============ VOICE API ============
export const VoiceAPI = {
    /**
     * Get list of available voices
     */
    async getVoices() {
        return apiFetch<{ data: any[] }>('/voice/generate');
    },

    /**
     * Generate speech from text
     */
    async generate(text: string, voiceId: string, options?: { speed?: number; pitch?: number }) {
        return apiFetch<{ data: { audioBase64: string; cost: number } }>('/voice/generate', {
            method: 'POST',
            body: JSON.stringify({ text, voiceId, ...options }),
        });
    },

    /**
     * Clone a voice from audio sample
     */
    async clone(name: string, audioFile: File) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('audio', audioFile);

        const response = await fetch(`${API_BASE}/voice/clone`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return { data: null, error: err.error || 'Clone failed' };
        }

        return { data: await response.json(), error: null };
    },
};

// ============ AVATAR API ============
export const AvatarAPI = {
    /**
     * Get list of available avatars
     */
    async getAvatars(filters?: { style?: string; gender?: string }) {
        const params = new URLSearchParams(filters as any).toString();
        return apiFetch<{ data: any[] }>(`/avatars${params ? `?${params}` : ''}`);
    },

    /**
     * Start avatar video generation
     */
    async generate(params: {
        avatarId: string;
        script: string;
        voiceId: string;
        background?: string;
    }) {
        return apiFetch<{ data: { jobId: string } }>('/avatars/render', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },

    /**
     * Get generation job status
     */
    async getJobStatus(jobId: string) {
        return apiFetch<{ data: { status: string; progress: number; videoUrl?: string } }>(
            `/avatars/render?jobId=${jobId}`
        );
    },
};

// ============ PPTX API ============
export const PPTXAPI = {
    /**
     * Upload and parse a PPTX file
     */
    async upload(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/pptx/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return { data: null, error: err.error || 'Upload failed' };
        }

        return { data: await response.json(), error: null };
    },

    /**
     * Get parsed slides for a project
     */
    async getSlides(projectId: string) {
        return apiFetch<{ slides: any[] }>(`/pptx/slides?projectId=${projectId}`);
    },
};

// ============ RENDER API ============
export const RenderAPI = {
    /**
     * Start video render job
     */
    async start(params: {
        projectId: string;
        slides: any[];
        config: {
            width: number;
            height: number;
            quality: string;
            fps?: number;
        };
        voiceId?: string;
        avatarId?: string;
    }) {
        return apiFetch<{ jobId: string }>('/render/start', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },

    /**
     * Get render job status
     */
    async getStatus(jobId: string) {
        return apiFetch<{
            status: string;
            progress: number;
            videoUrl?: string;
            error?: string;
        }>(`/render/jobs/${jobId}`);
    },

    /**
     * Cancel render job
     */
    async cancel(jobId: string) {
        return apiFetch<{ success: boolean }>(`/render/cancel`, {
            method: 'POST',
            body: JSON.stringify({ jobId }),
        });
    },

    /**
     * Get render queue stats
     */
    async getStats() {
        return apiFetch<{
            queued: number;
            processing: number;
            completed: number;
            failed: number;
        }>('/render/stats');
    },
};

// ============ EXPORT API ============
export const ExportAPI = {
    /**
     * Export video to MP4
     */
    async toMP4(params: {
        projectId: string;
        format: string;
        resolution: string;
        options?: {
            includeSubtitles?: boolean;
            watermark?: boolean;
        };
    }) {
        return apiFetch<{ jobId: string }>('/export/mp4', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },

    /**
     * Create SCORM package
     */
    async toSCORM(params: {
        projectId: string;
        videoUrl: string;
        title: string;
        scormVersion: 'scorm12' | 'scorm2004' | 'xapi';
        trackCompletion?: boolean;
        requireFullView?: boolean;
        passingScore?: number;
    }) {
        return apiFetch<{
            packageId: string;
            downloadUrl: string;
        }>('/export/scorm', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    },

    /**
     * Get export history
     */
    async getHistory(projectId: string) {
        return apiFetch<{ exports: any[] }>(`/export/create?projectId=${projectId}`);
    },
};

// ============ TEMPLATES API ============
export const TemplatesAPI = {
    /**
     * Get NR compliance templates
     */
    async getNRTemplates(category?: string) {
        const params = category ? `?category=${category}` : '';
        return apiFetch<{ templates: any[] }>(`/nr-templates${params}`);
    },

    /**
     * Get all templates
     */
    async getAll(filters?: { type?: string; industry?: string }) {
        const params = new URLSearchParams(filters as any).toString();
        return apiFetch<{ templates: any[] }>(`/templates${params ? `?${params}` : ''}`);
    },
};

// Export all APIs
export const API = {
    voice: VoiceAPI,
    avatar: AvatarAPI,
    pptx: PPTXAPI,
    render: RenderAPI,
    export: ExportAPI,
    templates: TemplatesAPI,
};

export default API;
