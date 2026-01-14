# Spec Delta: Real PPTX Generation

## MODIFIED Requirements

#### Requirement: PPTX Generation Must Use Project Data
The system MUST generate .pptx files using actual project data (slides, text, images) fetched from the database, completely replacing the placeholder generator.

#### Scenario: Generate PPTX from Multi-Slide Project
*   **Given** a Project with 3 slides (Title, Content, Image) stored in DB
*   **When** `generateRealPptxFromProject` is called
*   **Then** it fetches the project and slides from Prisma
*   **And** it maps each slide to a `pptxgenjs` slide
*   **And** it generates a valid .pptx file buffer
*   **And** it uploads the file to storage and updates `project.pptxUrl`
