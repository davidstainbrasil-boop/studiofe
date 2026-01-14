# Spec Delta: Real Image Processing

## MODIFIED Requirements

#### Requirement: Image Processing Must Be Real
The system MUST perform actual image manipulation (resize, crop, optimization) using a server-side library (e.g., `sharp`), rather than returning metadata-only stubs.

#### Scenario: User uploads 4K image for optimization
*   **Given** a user uploads a 4K image (3840x2160)
*   **When** the image is processed with `optimizeForWeb`
*   **Then** the system returns a WebP buffer
*   **And** the dimensions are resized to fit max width (e.g., 1920)
*   **And** the file size is significantly reduced compared to original
