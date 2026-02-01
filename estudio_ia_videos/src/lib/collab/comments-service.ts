/**
 * Comments Service
 * Handles project comments and collaboration features
 */

import { prisma } from '@lib/db';
import { Prisma } from '@prisma/client';

// Metadata structure stored in the metadata JSON field
interface CommentMetadata {
  position?: Record<string, unknown> | null;
  resolved?: boolean;
  element_id?: string | null;
  slideId?: string | null;
  timestamp?: number | null;
  resolutionNote?: string | null;
  reactions?: Array<{ userId: string; emoji: string }>;
}

export interface Comment {
  id: string;
  userId: string;
  projectId: string;
  slideId?: string;
  timestamp?: number;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  resolved?: boolean;
  replies?: Comment[];
  reactions?: { userId: string; emoji: string }[];
  resolutionNote?: string;
  position?: Record<string, unknown>;
  parentId?: string | null;
  user?: {
    id: string;
    email: string | null;
  };
}

export interface CreateCommentInput {
  userId: string;
  projectId: string;
  slideId?: string;
  timestamp?: number;
  content: string;
  resolutionNote?: string;
  position?: Record<string, unknown>;
  parentId?: string;
}

// Helper to safely parse metadata
function parseMetadata(metadata: Prisma.JsonValue | null): CommentMetadata {
  if (!metadata || typeof metadata !== 'object') return {};
  return metadata as CommentMetadata;
}

// Helper to create metadata JSON
function createMetadata(data: CommentMetadata): Prisma.InputJsonValue {
  return data as Prisma.InputJsonValue;
}

// User select for includes
const userSelect = {
  email: true,
  id: true
} as const;

export class CommentsService {
  
  async create(input: CreateCommentInput): Promise<Comment> {
    const { userId, projectId, content, position, parentId, slideId, timestamp, resolutionNote } = input;
    
    const metadata: CommentMetadata = { 
      position: position || null, 
      resolved: false,
      slideId: slideId || null,
      timestamp: timestamp || null,
      resolutionNote: resolutionNote || null,
    };

    const comment = await prisma.project_comments.create({
      data: {
        userId,
        projectId,
        content,
        metadata: createMetadata(metadata),
        parentId: parentId || null,
      },
      include: {
        users: { select: userSelect },
        other_project_comments: {
          include: {
            users: { select: userSelect }
          }
        }
      }
    });

    return this.mapPrismaComment(comment);
  }
  
  async get(commentId: string): Promise<Comment | null> {
    const comment = await prisma.project_comments.findUnique({
      where: { id: commentId },
      include: {
        users: { select: userSelect },
        other_project_comments: {
          include: {
            users: { select: userSelect }
          }
        }
      }
    });
    
    return comment ? this.mapPrismaComment(comment) : null;
  }
  
  async list(filters: Partial<Pick<Comment, 'projectId' | 'slideId' | 'userId'>>): Promise<Comment[]> {
    const where: Prisma.project_commentsWhereInput = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.userId) where.userId = filters.userId;
    // slideId is stored in metadata, which is complex to query directly
    // For now, we filter in code if needed
    
    const comments = await prisma.project_comments.findMany({
      where: {
        ...where,
        parentId: null // Only fetch root comments
      },
      include: {
        users: { select: userSelect },
        other_project_comments: {
          include: {
            users: { select: userSelect }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let results = comments.map(c => this.mapPrismaComment(c));
    
    // Filter by slideId if provided (check metadata)
    if (filters.slideId) {
      results = results.filter(c => c.slideId === filters.slideId);
    }

    return results;
  }
  
  async update(commentId: string, updates: Partial<Comment>): Promise<Comment | null> {
    try {
      // Get existing comment to merge metadata
      const existing = await prisma.project_comments.findUnique({
        where: { id: commentId }
      });
      
      if (!existing) return null;
      
      const existingMetadata = parseMetadata(existing.metadata);
      const newMetadata: CommentMetadata = {
        ...existingMetadata,
        resolved: updates.resolved ?? existingMetadata.resolved,
        position: updates.position ?? existingMetadata.position,
        resolutionNote: updates.resolutionNote ?? existingMetadata.resolutionNote,
      };

      const comment = await prisma.project_comments.update({
        where: { id: commentId },
        data: {
          content: updates.content,
          metadata: createMetadata(newMetadata),
        },
        include: {
          users: { select: userSelect },
          other_project_comments: {
            include: {
              users: { select: userSelect }
            }
          }
        }
      });
      return this.mapPrismaComment(comment);
    } catch {
      return null;
    }
  }
  
  async delete(commentId: string): Promise<boolean> {
    try {
      await prisma.project_comments.delete({
        where: { id: commentId }
      });
      return true;
    } catch {
      return false;
    }
  }
  
  async resolve(commentId: string): Promise<boolean> {
    try {
      const existing = await prisma.project_comments.findUnique({
        where: { id: commentId }
      });
      
      if (!existing) return false;
      
      const existingMetadata = parseMetadata(existing.metadata);
      const newMetadata: CommentMetadata = {
        ...existingMetadata,
        resolved: true,
      };

      await prisma.project_comments.update({
        where: { id: commentId },
        data: { metadata: createMetadata(newMetadata) }
      });
      return true;
    } catch {
      return false;
    }
  }
  
  async resolveComment(input: { commentId: string; userId: string; resolutionNote?: string }): Promise<boolean> {
    try {
      const existing = await prisma.project_comments.findUnique({
        where: { id: input.commentId }
      });
      
      if (!existing) return false;
      
      const existingMetadata = parseMetadata(existing.metadata);
      const newMetadata: CommentMetadata = {
        ...existingMetadata,
        resolved: true,
        resolutionNote: input.resolutionNote || null,
      };

      await prisma.project_comments.update({
        where: { id: input.commentId },
        data: { metadata: createMetadata(newMetadata) }
      });
      return true;
    } catch {
      return false;
    }
  }
  
  async reopenComment(input: { commentId: string; userId: string }): Promise<boolean> {
    try {
      const existing = await prisma.project_comments.findUnique({
        where: { id: input.commentId }
      });
      
      if (!existing) return false;
      
      const existingMetadata = parseMetadata(existing.metadata);
      const newMetadata: CommentMetadata = {
        ...existingMetadata,
        resolved: false,
        resolutionNote: null,
      };

      await prisma.project_comments.update({
        where: { id: input.commentId },
        data: { metadata: createMetadata(newMetadata) }
      });
      return true;
    } catch {
      return false;
    }
  }
  
  async addReaction(input: { commentId: string; userId: string; emoji: string }): Promise<boolean> {
    try {
      const existing = await prisma.project_comments.findUnique({
        where: { id: input.commentId }
      });
      
      if (!existing) return false;
      
      const existingMetadata = parseMetadata(existing.metadata);
      const reactions = existingMetadata.reactions || [];
      
      // Add reaction if not already present
      const hasReaction = reactions.some(
        r => r.userId === input.userId && r.emoji === input.emoji
      );
      
      if (!hasReaction) {
        reactions.push({ userId: input.userId, emoji: input.emoji });
      }
      
      const newMetadata: CommentMetadata = {
        ...existingMetadata,
        reactions,
      };

      await prisma.project_comments.update({
        where: { id: input.commentId },
        data: { metadata: createMetadata(newMetadata) }
      });
      return true;
    } catch {
      return false;
    }
  }

  async replyToComment(input: { commentId: string; userId: string; content: string }): Promise<Comment | null> {
    const parent = await prisma.project_comments.findUnique({ where: { id: input.commentId } });
    if (!parent) return null;

    const reply = await prisma.project_comments.create({
      data: {
        projectId: parent.projectId,
        userId: input.userId,
        content: input.content,
        parentId: input.commentId,
        metadata: createMetadata({ resolved: false }),
      },
      include: {
        users: { select: userSelect }
      }
    });

    return this.mapPrismaComment(reply);
  }

  async searchUsersForMention(options: { projectId: string; query: string; limit: number }): Promise<{ id: string; name: string; avatar?: string }[]> {
    const { query, limit } = options;
    
    // Search in auth_users (Supabase auth users)
    const users = await prisma.auth_users.findMany({
      where: {
        email: { contains: query, mode: 'insensitive' }
      },
      take: limit,
      select: {
        id: true,
        email: true,
      }
    });
    
    return users.map(u => ({
      id: u.id,
      name: u.email || 'Unknown',
      avatar: undefined
    }));
  }

  async getCommentStats(projectId: string): Promise<{ total: number; resolved: number; open: number }> {
    const comments = await prisma.project_comments.findMany({ 
      where: { projectId },
      select: { metadata: true }
    });
    
    let resolved = 0;
    for (const comment of comments) {
      const meta = parseMetadata(comment.metadata);
      if (meta.resolved) resolved++;
    }
    
    return {
      total: comments.length,
      resolved,
      open: comments.length - resolved
    };
  }

  async deleteComment(input: { commentId: string; userId: string }): Promise<boolean> {
    const comment = await prisma.project_comments.findUnique({ where: { id: input.commentId } });
    if (!comment) return false;
    if (comment.userId !== input.userId) return false; 
    
    return this.delete(input.commentId);
  }

  private mapPrismaComment(c: Record<string, unknown>): Comment {
    const metadata = parseMetadata(c.metadata as Prisma.JsonValue);
    const users = c.users as { id: string; email: string | null } | undefined;
    const replies = c.other_project_comments as Record<string, unknown>[] | undefined;
    
    return {
      id: c.id as string,
      userId: c.userId as string,
      projectId: c.projectId as string,
      content: c.content as string,
      createdAt: c.createdAt as Date,
      updatedAt: c.updatedAt as Date | undefined,
      resolved: metadata.resolved,
      parentId: c.parentId as string | null | undefined,
      position: metadata.position as Record<string, unknown> | undefined,
      slideId: metadata.slideId || undefined,
      timestamp: metadata.timestamp || undefined,
      resolutionNote: metadata.resolutionNote || undefined,
      reactions: metadata.reactions || [],
      user: users ? {
        id: users.id,
        email: users.email,
      } : undefined,
      replies: replies ? replies.map((r) => this.mapPrismaComment(r)) : []
    };
  }
}

export const commentsService = new CommentsService();
