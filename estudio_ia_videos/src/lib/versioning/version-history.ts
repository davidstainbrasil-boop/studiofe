/**
 * 📜 Version History Service
 * Manages project version snapshots and restoration
 */

import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';
import { diffVersions, applyDelta, createDelta, deltaSize } from './delta-calculator';

export interface ProjectVersion {
  id: string;
  projectId: string;
  version: number;
  snapshot: Record<string, unknown> | null;
  delta: Record<string, unknown> | null;
  description: string | null;
  createdAt: Date;
  createdBy: string | null;
}

export interface VersionSummary {
  id: string;
  version: number;
  description: string | null;
  createdAt: Date;
  createdBy: string | null;
}

/**
 * Create a new version snapshot for a project
 * Note: The existing schema stores version metadata, not full snapshots.
 * For full snapshot storage, we use the project's `data` field and track changes here.
 */
export async function createVersion(
  projectId: string,
  snapshot: Record<string, unknown>,
  options?: {
    description?: string;
    userId?: string;
    previousSnapshot?: Record<string, unknown>;
  }
): Promise<ProjectVersion> {
  try {
    // Get the latest version number
    const latestVersion = await prisma.project_versions.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { versionNumber: true }
    });

    // Parse version or start at 1
    const currentNum = latestVersion?.versionNumber 
      ? parseInt(latestVersion.versionNumber.replace(/^v/, ''), 10) 
      : 0;
    const newVersionNumber = `v${currentNum + 1}`;
    
    // Calculate changes summary if we have previous snapshot
    let changesSummary = 'Initial version';
    if (options?.previousSnapshot) {
      const delta = createDelta(options.previousSnapshot, snapshot);
      const changeCount = deltaSize(delta);
      changesSummary = `${changeCount} changes`;
    }

    // Store version metadata (schema doesn't have snapshot field, use metadata JSON)
    const version = await prisma.project_versions.create({
      data: {
        projectId,
        versionNumber: newVersionNumber,
        name: options?.description || `Version ${newVersionNumber}`,
        description: options?.description,
        changesSummary,
        createdBy: options?.userId || 'system',
        metadata: { snapshot } as any // Store snapshot in metadata JSON field
      }
    });

    logger.info(`Created version ${newVersionNumber} for project ${projectId}`, {
      component: 'VersionHistory'
    });

    return {
      id: version.id,
      projectId: version.projectId,
      version: currentNum + 1,
      snapshot,
      delta: null,
      description: version.description,
      createdAt: version.createdAt || new Date(),
      createdBy: version.createdBy
    };
  } catch (error) {
    logger.error('Failed to create version', error instanceof Error ? error : new Error(String(error)), {
      component: 'VersionHistory',
      projectId
    });
    throw error;
  }
}

/**
 * Get version history for a project
 */
export async function getVersions(
  projectId: string,
  options?: { limit?: number; offset?: number }
): Promise<VersionSummary[]> {
  const versions = await prisma.project_versions.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
    select: {
      id: true,
      versionNumber: true,
      description: true,
      createdAt: true,
      createdBy: true
    }
  });

  return versions.map(v => ({
    id: v.id,
    version: parseInt(v.versionNumber.replace(/^v/, ''), 10) || 0,
    description: v.description,
    createdAt: v.createdAt || new Date(),
    createdBy: v.createdBy
  }));
}

/**
 * Get a specific version's full snapshot from metadata
 */
export async function getVersionSnapshot(
  projectId: string,
  versionNumber: number
): Promise<Record<string, unknown> | null> {
  // Find the requested version by versionNumber string
  const requestedVersion = await prisma.project_versions.findFirst({
    where: { projectId, versionNumber: `v${versionNumber}` }
  });

  if (!requestedVersion) {
    return null;
  }

  // Extract snapshot from metadata JSON
  const metadata = requestedVersion.metadata as Record<string, unknown> | null;
  if (metadata?.snapshot) {
    return metadata.snapshot as Record<string, unknown>;
  }

  // No snapshot in this version's metadata
  logger.warn('Version has no snapshot in metadata', {
    component: 'VersionHistory',
    projectId,
    versionNumber
  });
  return null;
}

/**
 * Restore a project to a specific version
 */
export async function restoreVersion(
  projectId: string,
  versionNumber: number,
  userId?: string
): Promise<{ success: boolean; snapshot?: Record<string, unknown> }> {
  const snapshot = await getVersionSnapshot(projectId, versionNumber);

  if (!snapshot) {
    return { success: false };
  }

  // Update the project with the restored snapshot
  await prisma.projects.update({
    where: { id: projectId },
    data: {
      data: snapshot as any,
      updatedAt: new Date()
    }
  });

  // Create a new version marking the restoration
  await createVersion(projectId, snapshot, {
    description: `Restored from version ${versionNumber}`,
    userId
  });

  logger.info(`Restored project ${projectId} to version ${versionNumber}`, {
    component: 'VersionHistory'
  });

  return { success: true, snapshot };
}

/**
 * Compare two versions
 */
export async function compareVersions(
  projectId: string,
  versionA: number,
  versionB: number
): Promise<{ diff: Record<string, unknown> | null }> {
  const [snapshotA, snapshotB] = await Promise.all([
    getVersionSnapshot(projectId, versionA),
    getVersionSnapshot(projectId, versionB)
  ]);

  if (!snapshotA || !snapshotB) {
    return { diff: null };
  }

  return { diff: diffVersions(snapshotA, snapshotB) };
}

/**
 * Clean up old versions (keep last N versions)
 */
export async function pruneVersions(projectId: string, keepCount: number = 100): Promise<number> {
  const versions = await prisma.project_versions.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    skip: keepCount,
    select: { id: true }
  });

  if (versions.length === 0) {
    return 0;
  }

  const deleted = await prisma.project_versions.deleteMany({
    where: {
      id: { in: versions.map(v => v.id) }
    }
  });

  logger.info(`Pruned ${deleted.count} old versions for project ${projectId}`, {
    component: 'VersionHistory'
  });

  return deleted.count;
}
