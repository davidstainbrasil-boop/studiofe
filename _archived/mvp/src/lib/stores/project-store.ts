import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface ProjectItem {
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
  _count: {
    slides: number;
    collaborators: number;
    renderJobs: number;
  };
}

export interface ProjectFilters {
  search: string;
  status: string | null;
  page: number;
  limit: number;
}

interface ProjectState {
  // Selection
  selectedProjectId: string | null;

  // Filters
  filters: ProjectFilters;

  // UI state
  isCreateDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  projectToDelete: string | null;

  // Actions
  setSelectedProject: (id: string | null) => void;
  setFilters: (filters: Partial<ProjectFilters>) => void;
  resetFilters: () => void;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openDeleteDialog: (projectId: string) => void;
  closeDeleteDialog: () => void;
}

const defaultFilters: ProjectFilters = {
  search: '',
  status: null,
  page: 1,
  limit: 20,
};

export const useProjectStore = create<ProjectState>()(
  devtools(
    immer((set) => ({
      selectedProjectId: null,
      filters: { ...defaultFilters },
      isCreateDialogOpen: false,
      isDeleteDialogOpen: false,
      projectToDelete: null,

      setSelectedProject: (id) =>
        set((state) => {
          state.selectedProjectId = id;
        }),

      setFilters: (updates) =>
        set((state) => {
          Object.assign(state.filters, updates);
          // Reset page when filters change (except page itself)
          if (!('page' in updates)) {
            state.filters.page = 1;
          }
        }),

      resetFilters: () =>
        set((state) => {
          state.filters = { ...defaultFilters };
        }),

      openCreateDialog: () =>
        set((state) => {
          state.isCreateDialogOpen = true;
        }),

      closeCreateDialog: () =>
        set((state) => {
          state.isCreateDialogOpen = false;
        }),

      openDeleteDialog: (projectId) =>
        set((state) => {
          state.isDeleteDialogOpen = true;
          state.projectToDelete = projectId;
        }),

      closeDeleteDialog: () =>
        set((state) => {
          state.isDeleteDialogOpen = false;
          state.projectToDelete = null;
        }),
    })),
    { name: 'project-store' }
  )
);
