# Webhooks Integration Guide

The CursosTecno Video Platform allows you to subscribe to real-time events via webhooks. This is useful for integrating your rendering workflow with external systems (e.g., Slack, Custom Dashboards).

## Configuration

Webhooks can be managed via the Admin Dashboard at **Settings > Webhooks**.
You can:
- Add a destination URL.
- Select specific events to subscribe to.
- Test the integration.

## Supported Events

The following events are currently supported:

### `render.completed`

Triggered when a video processing job completes successfully.

**Payload:**

```json
{
  "event": "render.completed",
  "data": {
    "jobId": "job_123456789",
    "projectId": "proj_987654321",
    "videoUrl": "https://storage.cursostecno.com.br/videos/job_123.mp4",
    "duration": 45.5,
    "timestamp": "2024-01-16T10:00:00Z"
  }
}
```

### `render.failed`

Triggered when a video processing job encounters an error.

**Payload:**

```json
{
  "event": "render.failed",
  "data": {
    "jobId": "job_123456789",
    "projectId": "proj_987654321",
    "error": "Timeout waiting for TTS service",
    "timestamp": "2024-01-16T10:05:00Z"
  }
}
```

## Security (Coming Soon)
We will soon implement HMAC signature verification for secure communication. The signature will be sent in the `X-Webhook-Signature` header.
