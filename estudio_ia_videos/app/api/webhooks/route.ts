/**
 * 🔔 Webhooks API
 * MVP Vídeos TécnicoCursos v7
 * 
 * Endpoints:
 * - GET /api/webhooks - Lista endpoints do usuário
 * - POST /api/webhooks - Registra novo endpoint
 * - GET /api/webhooks/[id] - Detalhes de um endpoint
 * - PATCH /api/webhooks/[id] - Atualiza endpoint
 * - DELETE /api/webhooks/[id] - Remove endpoint
 * - POST /api/webhooks/[id]/test - Envia ping de teste
 * - POST /api/webhooks/[id]/rotate-secret - Rotaciona secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  webhookService,
  WEBHOOK_EVENT_CATEGORIES,
  ALL_WEBHOOK_EVENTS,
  type WebhookEventType,
} from '../../src/lib/webhooks/webhook-service';

// ===========================================
// Validation Schemas
// ===========================================

const createEndpointSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

const updateEndpointSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

// ===========================================
// GET Handler - List Endpoints
// ===========================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const endpointId = searchParams.get('id');
  const action = searchParams.get('action');

  try {
    // Se tiver ID, retorna detalhes do endpoint
    if (endpointId) {
      const endpoint = webhookService.getEndpoint(endpointId);
      
      if (!endpoint) {
        return NextResponse.json(
          { success: false, error: 'Endpoint not found' },
          { status: 404 }
        );
      }

      // Mascarar o secret (mostrar apenas últimos 8 chars)
      const maskedEndpoint = {
        ...endpoint,
        secret: `******${endpoint.secret.slice(-8)}`,
      };

      return NextResponse.json({
        success: true,
        data: maskedEndpoint,
      });
    }

    // Action: lista categorias de eventos
    if (action === 'event-types') {
      return NextResponse.json({
        success: true,
        data: {
          categories: WEBHOOK_EVENT_CATEGORIES,
          all: ALL_WEBHOOK_EVENTS,
        },
      });
    }

    // Action: estatísticas do serviço
    if (action === 'stats') {
      return NextResponse.json({
        success: true,
        data: webhookService.getStats(),
      });
    }

    // Listar todos os endpoints (em produção, filtrar por owner_id)
    const endpoints = webhookService.listEndpoints();
    
    // Mascarar secrets
    const maskedEndpoints = endpoints.map(ep => ({
      ...ep,
      secret: `******${ep.secret.slice(-8)}`,
    }));

    return NextResponse.json({
      success: true,
      data: {
        endpoints: maskedEndpoints,
        count: maskedEndpoints.length,
      },
    });
  } catch (error) {
    console.error('[Webhooks API] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ===========================================
// POST Handler - Create Endpoint or Actions
// ===========================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const endpointId = searchParams.get('id');

  try {
    // Action: Test endpoint
    if (action === 'test' && endpointId) {
      const result = await webhookService.testEndpoint(endpointId);
      return NextResponse.json({
        success: result.success,
        data: result,
      });
    }

    // Action: Rotate secret
    if (action === 'rotate-secret' && endpointId) {
      const newSecret = webhookService.rotateSecret(endpointId);
      
      if (!newSecret) {
        return NextResponse.json(
          { success: false, error: 'Endpoint not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          secret: newSecret,
          message: 'Secret rotated successfully. Update your integration with the new secret.',
        },
      });
    }

    // Default: Create new endpoint
    const body = await req.json();
    const parsed = createEndpointSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Validar eventos
    const validEvents = parsed.data.events.filter(e => 
      ALL_WEBHOOK_EVENTS.includes(e as WebhookEventType)
    ) as WebhookEventType[];

    if (validEvents.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid events specified',
          valid_events: ALL_WEBHOOK_EVENTS,
        },
        { status: 400 }
      );
    }

    // Criar endpoint
    const endpoint = webhookService.registerEndpoint(
      parsed.data.url,
      validEvents,
      {
        name: parsed.data.name,
        description: parsed.data.description,
        // owner_id seria extraído do token de autenticação
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        ...endpoint,
        message: 'Webhook endpoint created. Save the secret - it will not be shown again.',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[Webhooks API] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ===========================================
// PATCH Handler - Update Endpoint
// ===========================================

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const endpointId = searchParams.get('id');

  if (!endpointId) {
    return NextResponse.json(
      { success: false, error: 'Endpoint ID required' },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const parsed = updateEndpointSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Preparar updates
    const updates: Parameters<typeof webhookService.updateEndpoint>[1] = {};

    if (parsed.data.url) updates.url = parsed.data.url;
    if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled;
    if (parsed.data.events) {
      const validEvents = parsed.data.events.filter(e => 
        ALL_WEBHOOK_EVENTS.includes(e as WebhookEventType)
      ) as WebhookEventType[];
      if (validEvents.length > 0) {
        updates.events = validEvents;
      }
    }
    if (parsed.data.name || parsed.data.description) {
      updates.metadata = {
        name: parsed.data.name,
        description: parsed.data.description,
      };
    }

    const updated = webhookService.updateEndpoint(endpointId, updates);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Endpoint not found' },
        { status: 404 }
      );
    }

    // Mascarar secret
    const maskedEndpoint = {
      ...updated,
      secret: `******${updated.secret.slice(-8)}`,
    };

    return NextResponse.json({
      success: true,
      data: maskedEndpoint,
    });
  } catch (error) {
    console.error('[Webhooks API] PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ===========================================
// DELETE Handler - Remove Endpoint
// ===========================================

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const endpointId = searchParams.get('id');

  if (!endpointId) {
    return NextResponse.json(
      { success: false, error: 'Endpoint ID required' },
      { status: 400 }
    );
  }

  try {
    const deleted = webhookService.deleteEndpoint(endpointId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Endpoint not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Endpoint deleted successfully',
        endpoint_id: endpointId,
      },
    });
  } catch (error) {
    console.error('[Webhooks API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
