/**
 * 🤝 Collaboration Module
 * Exporta todos os componentes e hooks de colaboração em tempo real
 */

// Types
export * from './types';

// Services
export { lockService, LockService } from './lock-service';

// Server (use apenas no servidor)
export {
  CollaborationServer,
  initCollaborationServer,
  getCollaborationServer
} from './collaboration-server';

// Client Hook
export { useCollaboration } from './use-collaboration';
export type { UseCollaborationOptions, UseCollaborationReturn } from './use-collaboration';

// Components
export {
  CollaboratorAvatar,
  CollaboratorCursor,
  CollaboratorIndicators,
  TrackLockIndicator,
  SelectionHighlight,
  ConnectionStatus
} from './CollaboratorIndicators';
