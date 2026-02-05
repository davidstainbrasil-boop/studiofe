import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Webhook types
type WebhookEvent =
  | 'video.completed'
  | 'user.created'
  | 'subscription.created'
  | 'subscription.updated'
  | 'template.purchased'
  | 'error.occurred'
  | 'user.deleted'
  | 'video.shared';

interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: any;
  userId?: string;
  metadata?: Record<string, any>;
  signature: string;
}

interface WebhookSubscription {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  active: boolean;
  userId: string;
  createdAt: string;
  lastTriggered?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if provided
    const signature = request.headers.get('x-webhook-signature');
    const body = await request.text();

    if (signature) {
      const crypto = require('crypto');
      const calculatedSignature = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET!)
        .update(body, 'utf8')
        .digest('hex');

      if (signature !== calculatedSignature) {
        return NextResponse.json(
          {
            error: 'Invalid signature',
          },
          { status: 401 },
        );
      }
    }

    let webhookData: WebhookPayload;

    try {
      webhookData = JSON.parse(body);
    } catch (error) {
      console.error('Invalid webhook payload:', error);
      return NextResponse.json(
        {
          error: 'Invalid payload',
        },
        { status: 400 },
      );
    }

    // Process webhook
    await processWebhook(webhookData);

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      id: webhookData.id,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error.message,
      },
      { status: 500 },
    );
  }
}

async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Get webhooks for user
    const webhooks = await prisma.webhook.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      webhooks,
      filters: {
        types: getAvailableEventTypes(),
        statuses: ['active', 'inactive', 'failed'],
      },
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url, events, description } = body;

    if (!url || !events || !Array.isArray(events)) {
      return NextResponse.json(
        {
          error: 'URL, events, and description are required',
        },
        { status: 400 },
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid URL format',
        },
        { status: 400 },
      );
    }

    // Create webhook
    const webhook = await prisma.webhook.create({
      data: {
        url,
        secret: generateSecret(),
        events,
        description,
        userId: session.user.id,
        active: true,
      },
    });

    // Test webhook with a ping
    const testResult = await testWebhook(url, webhook.secret);

    if (!testResult.success) {
      // Deactivate webhook if test fails
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: { active: false },
      });

      return NextResponse.json(
        {
          error: 'Webhook validation failed. Please check the URL and try again.',
          details: testResult.error,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        url,
        events,
        description,
        secret: webhook.secret,
        active: true,
      },
      testResult,
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      {
        error: 'Failed to create webhook',
        details: error.message,
      },
      { status: 500 },
    );
  }
}

async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get webhook and verify ownership
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Delete webhook and related logs
    await prisma.webhookLog.deleteMany({
      where: { webhookId: params.id },
    });

    await prisma.webhook.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete webhook',
        details: error.message,
      },
      { status: 500 },
    );
  }
}

async function processWebhook(webhookData: WebhookPayload) {
  const { event, data, metadata } = webhookData;

  switch (event) {
    case 'video.completed':
      await handleVideoCompleted(data, metadata);
      break;

    case 'user.created':
      await handleUserCreated(data, metadata);
      break;

    case 'subscription.created':
      await handleSubscriptionCreated(data, metadata);
      break;

    case 'subscription.updated':
      await handleSubscriptionUpdated(data, metadata);
      break;

    case 'template.purchased':
      await handleTemplatePurchased(data, metadata);
      break;

    case 'video.shared':
      await handleVideoShared(data, metadata);
      break;

    case 'error.occurred':
      await handleErrorOccurred(data, metadata);
      break;

    default:
      console.log('Unknown webhook event:', event);
  }
}

async function handleVideoCompleted(data: any, metadata: any) {
  // Send notification to user
  if (metadata?.userId) {
    await prisma.notification.create({
      data: {
        userId: metadata.userId,
        type: 'VIDEO_COMPLETED',
        title: 'Vídeo Concluído!',
        message: `Seu vídeo "${data.title}" está pronto para visualização.`,
        data: {
          videoId: data.id,
          videoUrl: data.url,
          duration: data.duration,
          thumbnailUrl: data.thumbnailUrl,
        },
      },
    });
  }

  // Send to external integrations
  if (data.integrationId) {
    await sendToIntegration(data.integrationId, {
      event: 'video.completed',
      data,
    });
  }
}

async function handleUserCreated(data: any, metadata: any) {
  console.log('User created:', data);
}

async function handleSubscriptionCreated(data: any, metadata: any) {
  console.log('Subscription created:', data);
}

async function handleSubscriptionUpdated(data: any, metadata: any) {
  console.log('Subscription updated:', data);
}

async function handleTemplatePurchased(data: any, metadata: any) {
  console.log('Template purchased:', data);
}

async function handleVideoShared(data: any, metadata: any) {
  console.log('Video shared:', data);
}

async function handleErrorOccurred(data: any, metadata: any) {
  console.error('Error occurred:', data);

  // Send error notification to admins
  await prisma.notification.create({
    data: {
      type: 'ERROR',
      title: 'Erro no sistema',
      message: data.error || 'Ocorreu um erro desconhecido.',
      data: metadata,
    },
  });
}

async function sendToIntegration(integrationId: string, payload: any) {
  // Implementation for external integrations
  console.log(`Sending to integration ${integrationId}:`, payload);
}

function generateSecret(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

async function testWebhook(
  url: string,
  secret: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': secret,
        'User-Agent': 'TécnicoCursos-Webhook-Validator/1.0',
      },
      body: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
      }),
      timeout: 10000, // 10 second timeout
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getAvailableEventTypes(): WebhookEvent[] {
  return [
    'video.completed',
    'user.created',
    'subscription.created',
    'subscription.updated',
    'template.purchased',
    'error.occurred',
    'user.deleted',
    'video.shared',
  ];
}

const prisma = require('@/lib/database/prisma').prisma;
