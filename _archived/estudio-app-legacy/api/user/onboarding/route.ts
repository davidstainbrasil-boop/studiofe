/**
 * User Onboarding API Route
 * Salva dados do onboarding wizard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { profile, useCase, voiceConfig } = body;

    // Update user profile
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        name: profile.name,
        role_description: profile.role,
        company: profile.company,
        team_size: profile.teamSize,
        use_case: useCase,
        default_voice_id: voiceConfig.voiceId,
        default_voice_speed: voiceConfig.speed,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      console.error('Error saving profile:', profileError);
      return NextResponse.json(
        { error: 'Erro ao salvar perfil' },
        { status: 500 }
      );
    }

    // Create user preferences
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        default_voice: voiceConfig.voiceId,
        voice_speed: voiceConfig.speed,
        preferred_resolution: '1080p',
        notifications_enabled: true,
        email_updates: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    // Track onboarding completion
    await supabase
      .from('analytics_events')
      .insert({
        user_id: user.id,
        event_type: 'onboarding_completed',
        event_data: {
          profile,
          useCase,
          voiceConfig,
        },
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: 'Onboarding concluído com sucesso',
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Get onboarding status
    const { data: userData, error } = await supabase
      .from('users')
      .select('onboarding_completed, onboarding_completed_at')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json({
        completed: false,
        completedAt: null,
      });
    }

    return NextResponse.json({
      completed: userData?.onboarding_completed || false,
      completedAt: userData?.onboarding_completed_at || null,
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
