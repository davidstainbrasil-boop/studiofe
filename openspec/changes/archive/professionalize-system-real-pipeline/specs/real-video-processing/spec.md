# Spec Delta: Real Video Processing

## MODIFIED Requirements

### Video Analysis & Thumbnails
- **Requirement**: `ThumbnailGenerator` MUST use `ffmpeg`/`ffprobe` to analyze video files.
- **Requirement**: It MUST NOT return random/hardcoded scene timestamps.
- **Scenario**:
  - GIVEN a video file input
  - WHEN `detectScenes` is called
  - THEN `ffmpeg` scene detection filter is executed
  - AND actual scene timestamps are returned based on visual content changes.
