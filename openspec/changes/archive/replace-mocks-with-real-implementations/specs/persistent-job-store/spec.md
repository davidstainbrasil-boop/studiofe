# Spec Delta: Persistent Job Store

## MODIFIED Requirements

#### Requirement: Job State Must Be Persistent
The system MUST store all background job states (rendering, processing) in a persistent store (Redis/Database) to survive application restarts, replacing in-memory Maps.

#### Scenario: Server restart during processing
*   **Given** a render job is in 'processing' state
*   **When** the application server restarts
*   **Then** the job state is preserved in Redis/DB
*   **And** the job can be resumed or marked as failed (not lost)
