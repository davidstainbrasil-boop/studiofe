type Project = {
  id: string
  userId: string
  title: string
  description: string
  status: 'draft' | 'processing' | 'ready' | 'error'
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export const mockProjects = new Map<string, Project>()

export function addProject(project: Project) {
  mockProjects.set(project.id, project)
}

export function getUserProjects(userId: string): Project[] {
  return Array.from(mockProjects.values())
    .filter(p => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
