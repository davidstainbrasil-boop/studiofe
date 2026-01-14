- [ ] **Phase 1: Secure Authentication**
    - [x] Update `middleware.ts`: Remove `dev_bypass` cookie check.
    - [x] Update `src/lib/supabase/browser.ts`: Remove `dev_bypass` and `allowMock`.
    - [x] Update `src/components/auth/login-form.tsx`: Remove `dev_bypass` injection.
    - [x] Clean up Test Scripts: Remove `DEV_BYPASS` from `playwright.config.ts`, `global-setup.ts`, and test helpers.
    - [ ] **Validation**: Run `npm run test:e2e` (expect failures until real auth in CI). Verify 401 on protected routes without session.

- [ ] **Phase 2: Real Upload Pipeline**
    - [ ] Refactor `src/lib/upload/upload-manager.ts`:
        - Remove `return { url: '/uploads/placeholder' }`.
        - Implement `supabase.storage.from('uploads').upload()`.
        - Implement `getPublicUrl()`.
    - [ ] **Validation**: Script `scripts/test-real-upload.ts` (upload small file, verify public URL is accessible).

- [ ] **Phase 3: Real Video Processing**
    - [ ] Refactor `src/lib/video/thumbnail-generator.ts`:
        - Remove "fake scenes" and "fake image generation".
        - Implement `fluent-ffmpeg` for `detectScenes`.
        - Implement `ffmpeg` screenshots for thumbnails.
    - [ ] **Validation**: Script `scripts/test-real-processing.ts` (process actual MP4, check output JPGs).

- [ ] **Phase 4: Real Dashboard Stats**
    - [ ] Refactor `src/app/api/dashboard/unified-stats/route.ts`:
        - Remove `if (isDevBypass) return mockData`.
        - Add SQL queries for `totalProjects`, `activeRenders`, `avgRenderTime`.
    - [ ] **Validation**: Manual check of Dashboard `/dashboard` matching DB row counts.

- [ ] **Phase 5: Cleanup & Docs**
    - [ ] Remove `src/lib/render-jobs/mock-store.ts` (if residues remain).
    - [ ] Remove `src/lib/slides/mockStore.ts` (if residues remain).
    - [ ] Audit and remove any other files with `mock` in name from `src`.
    - [ ] Update `readiness_report.md` with final status.
