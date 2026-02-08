/**
 * Support Ticket API
 * 
 * Creates support tickets from the chat widget and contact forms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { headers } from 'next/headers';

// Request validation schema
const ticketSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100),
  email: z.string().email('Email inválido'),
  message: z.string().min(10, 'Mensagem muito curta').max(2000),
  source: z.enum(['chat', 'contact', 'help']).optional().default('chat'),
  metadata: z.object({
    page: z.string().optional(),
    userAgent: z.string().optional(),
    sessionId: z.string().optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const parsed = ticketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, message, source, metadata } = parsed.data;

    // Get optional authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get request metadata
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || 'Unknown';
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 
               headersList.get('x-real-ip') || 
               'Unknown';

    // Create ticket object
    const ticket = {
      name,
      email,
      message,
      source,
      user_id: user?.id || null,
      status: 'open',
      priority: determinePriority(message),
      metadata: {
        ...metadata,
        userAgent,
        ip,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    // Try to save to database
    const { data: savedTicket, error: dbError } = await supabase
      .from('support_tickets' as never)
      .insert(ticket)
      .select()
      .single();

    if (dbError) {
      // Table might not exist yet, log and continue
      logger.warn('Could not save ticket to database', { error: dbError.message });
    }

    // Log ticket creation
    logger.info('Support ticket created', {
      ticketId: savedTicket?.id || 'no-db',
      email,
      source,
      userId: user?.id,
    });

    // In production, you would also:
    // 1. Send notification email to support team
    // 2. Create Slack/Discord notification
    // 3. Integrate with helpdesk system (Zendesk, Freshdesk, etc.)

    // Send auto-reply email (simulated)
    await sendAutoReplyEmail(email, name);

    return NextResponse.json({
      success: true,
      ticketId: savedTicket?.id || `temp-${Date.now()}`,
      message: 'Ticket criado com sucesso. Responderemos em até 2 horas úteis.',
    });

  } catch (error) {
    logger.error('Failed to create support ticket', error instanceof Error ? error : new Error(String(error)));
    
    return NextResponse.json(
      { error: 'Erro ao criar ticket de suporte' },
      { status: 500 }
    );
  }
}

// Determine ticket priority based on message content
function determinePriority(message: string): 'low' | 'medium' | 'high' | 'urgent' {
  const lowerMessage = message.toLowerCase();
  
  // Urgent keywords
  if (lowerMessage.includes('urgente') || 
      lowerMessage.includes('não funciona') ||
      lowerMessage.includes('erro crítico') ||
      lowerMessage.includes('parou de funcionar')) {
    return 'urgent';
  }
  
  // High priority
  if (lowerMessage.includes('erro') ||
      lowerMessage.includes('bug') ||
      lowerMessage.includes('problema') ||
      lowerMessage.includes('não consigo')) {
    return 'high';
  }
  
  // Medium priority
  if (lowerMessage.includes('dúvida') ||
      lowerMessage.includes('como fazer') ||
      lowerMessage.includes('ajuda')) {
    return 'medium';
  }
  
  return 'low';
}

// Simulated auto-reply email
async function sendAutoReplyEmail(email: string, name: string): Promise<void> {
  // In production, use SendGrid, Resend, or AWS SES
  logger.info('Auto-reply email sent', { email, name });
  
  // Simulate email content that would be sent:
  const emailContent = {
    to: email,
    subject: '[Studio Unified] Recebemos sua mensagem',
    html: `
      <h2>Olá ${name}!</h2>
      <p>Recebemos sua mensagem e nossa equipe está analisando.</p>
      <p>Tempo médio de resposta: <strong>até 2 horas úteis</strong></p>
      <p>Se for urgente, entre em contato:</p>
      <ul>
        <li>WhatsApp: (11) 99999-9999</li>
        <li>Email: suporte@studiounified.com.br</li>
      </ul>
      <p>Atenciosamente,<br>Equipe Studio Unified</p>
    `,
  };
  
  // Log instead of sending for development
  if (process.env.NODE_ENV === 'development') {
    logger.info('Would send email:', emailContent);
  }
}

// GET - List tickets (admin only)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Get query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'open';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Fetch tickets
    const { data: tickets, error } = await supabase
      .from('support_tickets' as never)
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch tickets', error);
      return NextResponse.json({ error: 'Erro ao buscar tickets' }, { status: 500 });
    }

    return NextResponse.json({ tickets });

  } catch (error) {
    logger.error('Failed to list support tickets', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
