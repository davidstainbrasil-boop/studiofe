# Spec: Visual Fidelity

## ADDED Requirements

### Requirement: Precise Element Positioning
The system MUST extract and preserve the exact x, y coordinates and dimensions of elements from the PPTX slide.

#### Scenario: Element Positioning
Given a PPTX slide with a text box at x=100, y=100.
When the slide is processed.
Then the resulting `UniversalSlideElement` must have `layout.x` approx 100 (converted to appropriate unit) and `layout.y` approx 100.
And the rendered video frame must show the text at that position.

### Requirement: Advanced Text Styling
The system SHALL extract font family, size, color, and weight from PPTX text runs.

#### Scenario: Text Styling
Given a PPTX slide with "Hello" in Red, 24pt, Bold.
When the slide is processed.
Then the `UniversalSlideElement` must have `style.color` red, `style.fontSize` 24 (scaled), and `style.fontWeight` bold.

### Requirement: Responsive Image Geometry
The system MUST extract the rendered dimensions of images, respecting cropping and scaling applied in PowerPoint.

#### Scenario: Image Geometry
Given a PPTX slide with an image resized to 50% width.
When processed.
Then the `UniversalSlideElement` for the image must contain the rendered width/height, not the original image file dimensions.
