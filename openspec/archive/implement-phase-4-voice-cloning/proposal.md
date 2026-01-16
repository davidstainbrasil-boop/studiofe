# Proposal: Implement Phase 4 - Voice Cloning & TTS (ElevenLabs)

**Change ID**: `implement-phase-4-voice-cloning`
**Status**: APPROVED
**Reference**: `PLANO_IMPLEMENTACAO_COMPLETO.md` (High Level)

## Summary
Implement a robust Voice System using ElevenLabs for high-quality Text-to-Speech (TTS) and Instant Voice Cloning. This integrates with the Avatar System (Phase 2) to provide audio for lip-sync using professionally cloned voices.

## Goals
1.  **ElevenLabs Integration**: Service class to handle TTS generation and Voice Cloning.
2.  **Voice Management**: Database schema and Repository to store `Voice` profiles (ID, Name, Provider, Category).
3.  **Cost Management**: Calculate character usage and deduct credits (ElevenLabs is expensive).
4.  **UI Integration**: `VoiceSelector` component to pick voices in the Studio.

## Architecture
*   **Service Layer**: `ElevenLabsService` (wraps official SDK or fetch).
*   **Data Layer**: `Voice` model in Prisma (already exists or needs update?).
*   **Orchestration**: `AudioGeneratorFactory` (similar to Avatar) to switch between Azure (Phase 1) and ElevenLabs (Phase 4).

## Non-Goals
*   Real-time streaming audio (for now, focus on async generation for video).
*   Self-hosted TTS (Coqui/Tortoise) - deferred to Phase 6.
