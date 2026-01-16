/**
 * E2E Test: AI Avatar Generation Flow
 * 
 * Verifies the complete lifecycle of an avatar video generation:
 * 1. Setup (User/Project)
 * 2. Request Avatar Render (Mock or Real)
 * 3. Poll for Completion
 * 4. Validate Output
 */

import { test, expect } from '@playwright/test';
import {
  validateDatabaseRecord,
  isPlaceholderPath,
  validateStorageFile,
  getValidUserId,
  createTestProject,
  cleanupTestData,
  createTestAvatar
} from './helpers/pptx-pipeline.helpers';
import crypto from 'crypto';

const MAX_RENDER_WAIT_MS = 300000; // 5 minutes (Avatar gen can be slow)

test.describe('E2E Avatar Generation Flow', () => {
    let jobId: string;
    let userId: string;
    let projectId: string;
    let avatarId: string;

    test.afterEach(async () => {
        if (jobId || projectId || avatarId) {
            await cleanupTestData(undefined, jobId, projectId, avatarId);
        }
    });

    test('Complete Avatar Pipeline: Request Render → Poll → Validate', async ({ request }) => {
        console.log('=== Starting E2E Avatar Generation Test ===');

        // 1. Setup
        userId = await getValidUserId();
        projectId = crypto.randomUUID();
        avatarId = crypto.randomUUID(); // Use valid UUID for Postgres UUID column
        
        await createTestProject(userId, projectId);
        await createTestAvatar(avatarId, userId);
        
        console.log(`✓ Setup complete: User ${userId}, Project ${projectId}, Avatar ${avatarId}`);

        // 2. Request Avatar Render
        // We use the new v2 API endpoint
        const response = await request.post('/api/v2/avatars/render', {
            headers: { 'x-user-id': userId },
            data: {
                projectId: projectId,
                avatarId: avatarId,
                text: 'Hello world',
                voiceId: 'en-US-1',
                animation: 'talking',
                quality: 'standard',
                audio2FaceEnabled: true
            }
        });

        // Debug response if failed
        if (response.status() !== 200) {
            console.error('Avatar Render Failed:', await response.text());
        }
        expect(response.status(), 'Render request should succeed').toBe(200);

        const data = await response.json();
        jobId = data.data?.jobId; // API returns { success: true, data: { jobId, ... } }
        expect(jobId, 'Should return a Job ID').toBeTruthy();
        console.log(`✓ Avatar Job Initiated: ${jobId}`);

        // 3. Poll for completion
        console.log('  - Polling for completion...');
        const startTime = Date.now();
        let status = 'pending';
        let outputUrl = '';

        while (Date.now() - startTime < MAX_RENDER_WAIT_MS) {
            const pollRes = await request.get(`/api/v2/avatars/render/status/${jobId}`, {
                headers: { 'x-user-id': userId }
            });
            expect(pollRes.status()).toBe(200);
            
            const pollData = await pollRes.json();
            status = pollData.status;
            
            if (status === 'completed' || status === 'failed') {
                outputUrl = pollData.url;
                if (status === 'failed') {
                    console.error('Job failed with error:', pollData.error);
                }
                break;
            }
            
            await new Promise(r => setTimeout(r, 5000));
        }

        expect(status, 'Job should complete successfully').toBe('completed');
        console.log('✓ Job completed');

        // 4. Validate Output
        expect(outputUrl).toBeTruthy();
        expect(isPlaceholderPath(outputUrl), 'Output URL should not be a placeholder').toBe(false);
        console.log(`✓ Output URL: ${outputUrl}`);

        // 5. Database Verification
        // Use helper to verify 'render_jobs' record was updated
        await validateDatabaseRecord('render_jobs', jobId, {
            status: 'completed',
            project_id: projectId
        });
        console.log('✓ Database record validated');
    });

    // Negative Test
    test('Should handle invalid requests gracefully', async ({ request }) => {
        const res = await request.post('/api/v2/avatars/render', {
            headers: { 'x-user-id': 'invalid-user' },
            data: {}
        });
        // Expect 400 Bad Request or 401 Unauthorized depending on middleware
        // But definitely not 500 or 200 with empty body
        expect(res.status(), 'Should reject invalid request').toBeGreaterThanOrEqual(400); 
    });
});
