import { getServiceRoleClient } from '../supabase'
import { logger } from '@/lib/logger';
import type { CreateProjectInput, Project } from './types'
import { Database } from '../supabase/database.types'
import { SupabaseClient } from '@supabase/supabase-js'

export async function listProjectsByOwner(ownerId: string): Promise<Project[]> {
  const supabase = getServiceRoleClient() as SupabaseClient<Database>
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq("user_id", ownerId)
    .order("created_at", { ascending: false })

  if (error) {
    logger.error('Supabase projects error:', new Error(String(error.message)))
    throw new Error(`Failed to list projects: ${error.message}`)
  }

  return (data ?? []) as unknown as Project[]
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const supabase = getServiceRoleClient() as SupabaseClient<Database>
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    logger.error('Supabase project error:', new Error(String(error.message)))
    throw new Error(`Failed to get project: ${error.message}`)
  }

  return (data ?? null) as unknown as Project | null
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const supabase = getServiceRoleClient() as SupabaseClient<Database>
  const payload = {
    user_id: input.ownerId,
    name: input.name,
    description: input.description ?? null,
    status: 'draft' as const,
    metadata: input.settings ?? null,
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`)
  }

  return data as Project
}

export * from './types'
