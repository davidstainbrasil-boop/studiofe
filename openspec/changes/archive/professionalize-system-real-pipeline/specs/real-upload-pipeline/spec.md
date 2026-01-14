# Spec Delta: Real Upload Pipeline

## MODIFIED Requirements

### File Upload Processing
- **Requirement**: The `UploadManager` MUST upload files to the configured Supabase Storage Bucket (e.g., `uploads` or `projects`).
- **Requirement**: It MUST NOT return hardcoded `/uploads/placeholder` URLs.
- **Scenario**:
  - GIVEN a file upload request
  - WHEN the upload completes
  - THEN the returned URL MUST start with the Supabase Storage public URL prefix (e.g. `https://<ref>.supabase.co/...`).
  - AND the file MUST exist in the bucket.
