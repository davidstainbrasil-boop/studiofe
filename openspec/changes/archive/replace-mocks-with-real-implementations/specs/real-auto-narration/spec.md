# Spec Delta: Real Auto-Narration

## MODIFIED Requirements

#### Requirement: Auto-Narration Must Generate Real Audio
The system MUST generate actual audio files using external TTS providers (ElevenLabs/Azure) for each slide note/text, replacing text-length estimation stubs.

#### Scenario: Auto-narrate presentation
*   **Given** a Project with slides containing notes
*   **When** the auto-narration process is triggered
*   **Then** the system calls the TTS provider for each slide
*   **And** it uploads the resulting audio to storage
*   **And** it safeguards against rate limits (queuing/batching)
*   **And** it saves the audio URL and exact duration to the slide data
