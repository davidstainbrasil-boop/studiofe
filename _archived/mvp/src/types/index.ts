// Core shared types for the MVP Dashboard
export type { AuthUser, AuthSession } from '@/lib/auth/session';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  thumbnailUrl: string | null;
  currentVersion: number;
  isPublic: boolean;
  collaborationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    slides: number;
    collaborators: number;
    renderJobs: number;
  };
}

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  completedRenders: number;
  totalCollaborators: number;
  recentActivity: ActivityEntry[];
  projectsByStatus: Record<string, number>;
}

export interface ActivityEntry {
  id: string;
  action: string;
  projectName: string;
  createdAt: string;
  userId: string;
  userName?: string;
}

export interface Collaborator {
  id: string;
  userId: string;
  role: string;
  permissions: Record<string, boolean>;
  invitedAt: string;
  acceptedAt: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}
