/**
 * Stripe Billing Service
 * Sistema completo de monetização com Stripe
 * 
 * Features:
 * - Checkout Sessions (cartão + PIX)
 * - Planos Free/Pro/Business
 * - Customer Portal
 * - Webhook handling
 * - Usage-based billing
 * - Subscription management
 * 
 * @module billing/stripe-service
 */

import Stripe from 'stripe';

// ============================================================================
// TYPES
// ============================================================================

export type PlanTier = 'free' | 'pro' | 'business' | 'enterprise';
export type BillingInterval = 'month' | 'year';
export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'past_due' 
  | 'trialing' 
  | 'unpaid'
  | 'paused';

export interface PlanConfig {
  id: PlanTier;
  name: string;
  description: string;
  features: string[];
  limits: PlanLimits;
  pricing: {
    monthly: number; // em centavos BRL
    yearly: number;  // em centavos BRL (com desconto)
    stripePriceIdMonthly?: string;
    stripePriceIdYearly?: string;
  };
  popular?: boolean;
}

export interface PlanLimits {
  videosPerMonth: number;
  maxVideoLengthMinutes: number;
  maxStorageGB: number;
  maxResolution: '720p' | '1080p' | '4k';
  customBranding: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  teamMembers: number;
  scormExport: boolean;
  whiteLabel: boolean;
}

export interface CustomerData {
  id: string;
  stripeCustomerId?: string;
  email: string;
  name?: string;
  plan: PlanTier;
  subscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  usage: UsageData;
}

export interface UsageData {
  videosThisMonth: number;
  storageUsedGB: number;
  lastResetDate: Date;
}

export interface CheckoutOptions {
  customerId: string;
  planTier: PlanTier;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
  couponCode?: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

export interface PortalOptions {
  customerId: string;
  returnUrl: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: Stripe.Event.Data.Object;
  };
  created: number;
}

export interface PaymentMethodInfo {
  id: string;
  type: 'card' | 'pix' | 'boleto';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

export interface InvoiceData {
  id: string;
  number: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: Date;
  dueDate?: Date;
  pdfUrl?: string;
  hostedUrl?: string;
}

// ============================================================================
// PLAN CONFIGURATIONS
// ============================================================================

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Gratuito',
    description: 'Perfeito para experimentar',
    features: [
      '1 vídeo por mês',
      'Até 5 minutos por vídeo',
      'Resolução 720p',
      '1GB de armazenamento',
      'Marca d\'água TécnicoCursos',
      'Suporte por email',
    ],
    limits: {
      videosPerMonth: 1,
      maxVideoLengthMinutes: 5,
      maxStorageGB: 1,
      maxResolution: '720p',
      customBranding: false,
      prioritySupport: false,
      apiAccess: false,
      teamMembers: 1,
      scormExport: false,
      whiteLabel: false,
    },
    pricing: {
      monthly: 0,
      yearly: 0,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para profissionais de SST',
    features: [
      '10 vídeos por mês',
      'Até 30 minutos por vídeo',
      'Resolução Full HD (1080p)',
      '10GB de armazenamento',
      'Sem marca d\'água',
      'Suporte prioritário',
      'Templates NR premium',
      'Export SCORM',
    ],
    limits: {
      videosPerMonth: 10,
      maxVideoLengthMinutes: 30,
      maxStorageGB: 10,
      maxResolution: '1080p',
      customBranding: true,
      prioritySupport: true,
      apiAccess: false,
      teamMembers: 1,
      scormExport: true,
      whiteLabel: false,
    },
    pricing: {
      monthly: 9700, // R$ 97,00
      yearly: 97000, // R$ 970,00 (2 meses grátis)
    },
    popular: true,
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'Para consultorias e empresas',
    features: [
      '50 vídeos por mês',
      'Vídeos ilimitados em duração',
      'Resolução 4K',
      '100GB de armazenamento',
      'White-label completo',
      'Suporte dedicado',
      'API completa',
      'Até 5 membros da equipe',
      'LMS Integration',
      'Analytics avançado',
    ],
    limits: {
      videosPerMonth: 50,
      maxVideoLengthMinutes: -1, // ilimitado
      maxStorageGB: 100,
      maxResolution: '4k',
      customBranding: true,
      prioritySupport: true,
      apiAccess: true,
      teamMembers: 5,
      scormExport: true,
      whiteLabel: true,
    },
    pricing: {
      monthly: 29700, // R$ 297,00
      yearly: 297000, // R$ 2.970,00 (2 meses grátis)
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Soluções personalizadas',
    features: [
      'Vídeos ilimitados',
      'Armazenamento ilimitado',
      'Membros ilimitados',
      'SLA garantido 99.9%',
      'Gerente de conta dedicado',
      'Treinamento personalizado',
      'Integração customizada',
      'Contrato anual',
    ],
    limits: {
      videosPerMonth: -1, // ilimitado
      maxVideoLengthMinutes: -1,
      maxStorageGB: -1,
      maxResolution: '4k',
      customBranding: true,
      prioritySupport: true,
      apiAccess: true,
      teamMembers: -1,
      scormExport: true,
      whiteLabel: true,
    },
    pricing: {
      monthly: 0, // Contato comercial
      yearly: 0,
    },
  },
};

// ============================================================================
// STRIPE SERVICE
// ============================================================================

const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => console.log(`[BILLING] ${msg}`, meta || ''),
  error: (msg: string, meta?: Record<string, unknown>) => console.error(`[BILLING ERROR] ${msg}`, meta || ''),
  warn: (msg: string, meta?: Record<string, unknown>) => console.warn(`[BILLING WARN] ${msg}`, meta || ''),
};

export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY não configurada');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });

    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  }

  // ==========================================================================
  // CUSTOMER MANAGEMENT
  // ==========================================================================

  /**
   * Cria ou recupera um customer no Stripe
   */
  async getOrCreateCustomer(
    userId: string,
    email: string,
    name?: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Customer> {
    // Busca customer existente
    const existing = await this.stripe.customers.list({
      email,
      limit: 1,
    });

    if (existing.data.length > 0) {
      logger.info('Customer existente encontrado', { customerId: existing.data[0].id });
      return existing.data[0];
    }

    // Cria novo customer
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
        ...metadata,
      },
    });

    logger.info('Novo customer criado', { customerId: customer.id, userId });
    return customer;
  }

  /**
   * Atualiza dados do customer
   */
  async updateCustomer(
    customerId: string,
    data: Partial<Stripe.CustomerUpdateParams>
  ): Promise<Stripe.Customer> {
    return this.stripe.customers.update(customerId, data);
  }

  /**
   * Deleta customer (GDPR compliance)
   */
  async deleteCustomer(customerId: string): Promise<void> {
    await this.stripe.customers.del(customerId);
    logger.info('Customer deletado', { customerId });
  }

  // ==========================================================================
  // CHECKOUT SESSIONS
  // ==========================================================================

  /**
   * Cria sessão de checkout para upgrade de plano
   */
  async createCheckoutSession(options: CheckoutOptions): Promise<Stripe.Checkout.Session> {
    const plan = PLANS[options.planTier];
    if (!plan) {
      throw new Error(`Plano inválido: ${options.planTier}`);
    }

    if (options.planTier === 'free') {
      throw new Error('Não é possível fazer checkout do plano gratuito');
    }

    if (options.planTier === 'enterprise') {
      throw new Error('Plano Enterprise requer contato comercial');
    }

    const priceId = options.interval === 'month' 
      ? plan.pricing.stripePriceIdMonthly 
      : plan.pricing.stripePriceIdYearly;

    // Se não tem Price ID configurado, cria price dinâmico
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [{
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Plano ${plan.name}`,
              description: plan.description,
              metadata: { planTier: options.planTier },
            },
            unit_amount: options.interval === 'month' 
              ? plan.pricing.monthly 
              : plan.pricing.yearly,
            recurring: {
              interval: options.interval,
            },
          },
          quantity: 1,
        }];

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: options.customerId,
      payment_method_types: ['card', 'boleto'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      locale: 'pt-BR',
      metadata: {
        planTier: options.planTier,
        interval: options.interval,
        ...options.metadata,
      },
      subscription_data: {
        metadata: {
          planTier: options.planTier,
        },
        trial_period_days: options.trialDays,
      },
      payment_method_options: {
        card: {
          installments: {
            enabled: true, // Parcelamento para cartão
          },
        },
        boleto: {
          expires_after_days: 3,
        },
      },
    };

    // Aplica cupom se fornecido
    if (options.couponCode) {
      const coupon = await this.validateCoupon(options.couponCode);
      if (coupon) {
        sessionParams.discounts = [{ coupon: coupon.id }];
      }
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    logger.info('Checkout session criada', {
      sessionId: session.id,
      planTier: options.planTier,
      customerId: options.customerId,
    });

    return session;
  }

  /**
   * Cria sessão de checkout para PIX (pagamento único)
   */
  async createPixCheckout(
    customerId: string,
    amount: number,
    description: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['pix'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: description,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: 'pt-BR',
      payment_method_options: {
        pix: {
          expires_after_seconds: 3600, // 1 hora
        },
      },
    });
  }

  // ==========================================================================
  // CUSTOMER PORTAL
  // ==========================================================================

  /**
   * Cria sessão do portal do cliente
   */
  async createPortalSession(options: PortalOptions): Promise<Stripe.BillingPortal.Session> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: options.customerId,
      return_url: options.returnUrl,
    });

    logger.info('Portal session criada', { customerId: options.customerId });
    return session;
  }

  // ==========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================================

  /**
   * Recupera subscription ativa do customer
   */
  async getActiveSubscription(customerId: string): Promise<Stripe.Subscription | null> {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    return subscriptions.data[0] || null;
  }

  /**
   * Cancela subscription no fim do período
   */
  async cancelSubscription(subscriptionId: string, immediately = false): Promise<Stripe.Subscription> {
    if (immediately) {
      return this.stripe.subscriptions.cancel(subscriptionId);
    }

    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  /**
   * Reativa subscription cancelada
   */
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  /**
   * Pausa subscription (proration)
   */
  async pauseSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'mark_uncollectible',
      },
    });
  }

  /**
   * Resume subscription pausada
   */
  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      pause_collection: '',
    });
  }

  /**
   * Upgrade/Downgrade de plano
   */
  async changePlan(
    subscriptionId: string,
    newPlanTier: PlanTier,
    interval: BillingInterval,
    prorate = true
  ): Promise<Stripe.Subscription> {
    const plan = PLANS[newPlanTier];
    if (!plan || newPlanTier === 'free' || newPlanTier === 'enterprise') {
      throw new Error(`Plano inválido para mudança: ${newPlanTier}`);
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const priceId = interval === 'month' 
      ? plan.pricing.stripePriceIdMonthly 
      : plan.pricing.stripePriceIdYearly;

    if (!priceId) {
      throw new Error(`Price ID não configurado para plano ${newPlanTier}`);
    }

    return this.stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: priceId,
      }],
      proration_behavior: prorate ? 'create_prorations' : 'none',
      metadata: {
        planTier: newPlanTier,
      },
    });
  }

  // ==========================================================================
  // PAYMENT METHODS
  // ==========================================================================

  /**
   * Lista payment methods do customer
   */
  async listPaymentMethods(customerId: string): Promise<PaymentMethodInfo[]> {
    const methods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
    const defaultMethodId = customer.invoice_settings?.default_payment_method;

    return methods.data.map(pm => ({
      id: pm.id,
      type: 'card' as const,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      } : undefined,
      isDefault: pm.id === defaultMethodId,
    }));
  }

  /**
   * Define payment method padrão
   */
  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  // ==========================================================================
  // INVOICES
  // ==========================================================================

  /**
   * Lista invoices do customer
   */
  async listInvoices(customerId: string, limit = 10): Promise<InvoiceData[]> {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data.map(inv => ({
      id: inv.id,
      number: inv.number || '',
      status: inv.status || 'unknown',
      amountDue: inv.amount_due,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      created: new Date(inv.created * 1000),
      dueDate: inv.due_date ? new Date(inv.due_date * 1000) : undefined,
      pdfUrl: inv.invoice_pdf || undefined,
      hostedUrl: inv.hosted_invoice_url || undefined,
    }));
  }

  /**
   * Recupera próxima invoice (preview)
   */
  async getUpcomingInvoice(customerId: string): Promise<Stripe.UpcomingInvoice | null> {
    try {
      return await this.stripe.invoices.retrieveUpcoming({
        customer: customerId,
      });
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // COUPONS & PROMOTIONS
  // ==========================================================================

  /**
   * Valida código de cupom
   */
  async validateCoupon(code: string): Promise<Stripe.Coupon | null> {
    try {
      const promotionCodes = await this.stripe.promotionCodes.list({
        code,
        active: true,
        limit: 1,
      });

      if (promotionCodes.data.length > 0) {
        return promotionCodes.data[0].coupon;
      }

      // Tenta como cupom direto
      const coupon = await this.stripe.coupons.retrieve(code);
      if (coupon.valid) {
        return coupon;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Cria cupom de desconto
   */
  async createCoupon(
    params: {
      percentOff?: number;
      amountOff?: number;
      duration: 'once' | 'repeating' | 'forever';
      durationInMonths?: number;
      maxRedemptions?: number;
      name: string;
    }
  ): Promise<Stripe.Coupon> {
    return this.stripe.coupons.create({
      percent_off: params.percentOff,
      amount_off: params.amountOff,
      currency: params.amountOff ? 'brl' : undefined,
      duration: params.duration,
      duration_in_months: params.durationInMonths,
      max_redemptions: params.maxRedemptions,
      name: params.name,
    });
  }

  // ==========================================================================
  // USAGE & METERING
  // ==========================================================================

  /**
   * Reporta uso para billing baseado em uso
   */
  async reportUsage(
    subscriptionItemId: string,
    quantity: number,
    timestamp?: Date
  ): Promise<Stripe.UsageRecord> {
    return this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: timestamp ? Math.floor(timestamp.getTime() / 1000) : 'now',
      action: 'increment',
    });
  }

  // ==========================================================================
  // WEBHOOKS
  // ==========================================================================

  /**
   * Verifica e parseia webhook event
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET não configurado');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }

  /**
   * Processa eventos de webhook
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const result: WebhookHandlerResult = {
      handled: true,
      action: '',
      data: {},
    };

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        result.action = 'checkout_completed';
        result.data = {
          customerId: session.customer,
          subscriptionId: session.subscription,
          planTier: session.metadata?.planTier,
          mode: session.mode,
        };
        logger.info('Checkout completado', result.data);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        result.action = 'subscription_created';
        result.data = {
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          status: subscription.status,
          planTier: subscription.metadata?.planTier,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        };
        logger.info('Subscription criada', result.data);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        result.action = 'subscription_updated';
        result.data = {
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          planTier: subscription.metadata?.planTier,
        };
        logger.info('Subscription atualizada', result.data);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        result.action = 'subscription_deleted';
        result.data = {
          customerId: subscription.customer,
          subscriptionId: subscription.id,
        };
        logger.info('Subscription deletada', result.data);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        result.action = 'payment_succeeded';
        result.data = {
          customerId: invoice.customer,
          invoiceId: invoice.id,
          amountPaid: invoice.amount_paid,
          subscriptionId: invoice.subscription,
        };
        logger.info('Pagamento bem-sucedido', result.data);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        result.action = 'payment_failed';
        result.data = {
          customerId: invoice.customer,
          invoiceId: invoice.id,
          amountDue: invoice.amount_due,
          subscriptionId: invoice.subscription,
          attemptCount: invoice.attempt_count,
        };
        logger.warn('Pagamento falhou', result.data);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        result.action = 'trial_ending';
        result.data = {
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          trialEnd: subscription.trial_end 
            ? new Date(subscription.trial_end * 1000) 
            : null,
        };
        logger.info('Trial terminando em breve', result.data);
        break;
      }

      default:
        result.handled = false;
        result.action = 'unhandled';
        result.data = { eventType: event.type };
    }

    return result;
  }
}

export interface WebhookHandlerResult {
  handled: boolean;
  action: string;
  data: Record<string, unknown>;
}

// ============================================================================
// PAYWALL SERVICE
// ============================================================================

export class PaywallService {
  private plans = PLANS;

  /**
   * Verifica se usuário pode executar ação baseado no plano
   */
  canPerformAction(
    userPlan: PlanTier,
    action: 'create_video' | 'export_scorm' | 'api_access' | 'white_label' | 'team_invite',
    currentUsage?: UsageData
  ): PaywallCheckResult {
    const plan = this.plans[userPlan];
    if (!plan) {
      return { allowed: false, reason: 'invalid_plan', upgradeRequired: 'pro' };
    }

    switch (action) {
      case 'create_video': {
        if (plan.limits.videosPerMonth === -1) {
          return { allowed: true };
        }
        if (currentUsage && currentUsage.videosThisMonth >= plan.limits.videosPerMonth) {
          return {
            allowed: false,
            reason: 'video_limit_reached',
            currentLimit: plan.limits.videosPerMonth,
            upgradeRequired: this.getNextPlan(userPlan),
          };
        }
        return { allowed: true };
      }

      case 'export_scorm':
        return plan.limits.scormExport
          ? { allowed: true }
          : { allowed: false, reason: 'feature_not_available', upgradeRequired: 'pro' };

      case 'api_access':
        return plan.limits.apiAccess
          ? { allowed: true }
          : { allowed: false, reason: 'feature_not_available', upgradeRequired: 'business' };

      case 'white_label':
        return plan.limits.whiteLabel
          ? { allowed: true }
          : { allowed: false, reason: 'feature_not_available', upgradeRequired: 'business' };

      case 'team_invite': {
        // Team members check would require actual team count
        if (plan.limits.teamMembers === -1) {
          return { allowed: true };
        }
        return {
          allowed: true, // Would need to check actual count
          currentLimit: plan.limits.teamMembers,
        };
      }

      default:
        return { allowed: false, reason: 'unknown_action' };
    }
  }

  /**
   * Verifica limites de vídeo
   */
  checkVideoLimits(
    userPlan: PlanTier,
    videoLengthMinutes: number,
    resolution: '720p' | '1080p' | '4k'
  ): PaywallCheckResult {
    const plan = this.plans[userPlan];
    if (!plan) {
      return { allowed: false, reason: 'invalid_plan' };
    }

    // Verifica duração
    if (plan.limits.maxVideoLengthMinutes !== -1 && 
        videoLengthMinutes > plan.limits.maxVideoLengthMinutes) {
      return {
        allowed: false,
        reason: 'video_too_long',
        currentLimit: plan.limits.maxVideoLengthMinutes,
        upgradeRequired: this.getNextPlan(userPlan),
      };
    }

    // Verifica resolução
    const resolutionHierarchy = ['720p', '1080p', '4k'];
    const planMaxResIndex = resolutionHierarchy.indexOf(plan.limits.maxResolution);
    const requestedResIndex = resolutionHierarchy.indexOf(resolution);

    if (requestedResIndex > planMaxResIndex) {
      return {
        allowed: false,
        reason: 'resolution_not_available',
        currentLimit: plan.limits.maxResolution,
        upgradeRequired: this.getNextPlan(userPlan),
      };
    }

    return { allowed: true };
  }

  /**
   * Verifica limite de storage
   */
  checkStorageLimit(userPlan: PlanTier, currentStorageGB: number): PaywallCheckResult {
    const plan = this.plans[userPlan];
    if (!plan) {
      return { allowed: false, reason: 'invalid_plan' };
    }

    if (plan.limits.maxStorageGB === -1) {
      return { allowed: true };
    }

    if (currentStorageGB >= plan.limits.maxStorageGB) {
      return {
        allowed: false,
        reason: 'storage_limit_reached',
        currentLimit: plan.limits.maxStorageGB,
        upgradeRequired: this.getNextPlan(userPlan),
      };
    }

    return { allowed: true };
  }

  /**
   * Retorna próximo plano para upgrade
   */
  private getNextPlan(currentPlan: PlanTier): PlanTier | undefined {
    const planOrder: PlanTier[] = ['free', 'pro', 'business', 'enterprise'];
    const currentIndex = planOrder.indexOf(currentPlan);
    return planOrder[currentIndex + 1];
  }

  /**
   * Retorna informações para exibir no paywall
   */
  getPaywallInfo(upgradeRequired: PlanTier): PaywallInfo {
    const plan = this.plans[upgradeRequired];
    return {
      planName: plan.name,
      planTier: upgradeRequired,
      monthlyPrice: plan.pricing.monthly / 100,
      yearlyPrice: plan.pricing.yearly / 100,
      features: plan.features,
      savings: this.calculateYearlySavings(upgradeRequired),
    };
  }

  /**
   * Calcula economia do plano anual
   */
  private calculateYearlySavings(planTier: PlanTier): number {
    const plan = this.plans[planTier];
    const monthlyTotal = plan.pricing.monthly * 12;
    return (monthlyTotal - plan.pricing.yearly) / 100;
  }
}

export interface PaywallCheckResult {
  allowed: boolean;
  reason?: string;
  currentLimit?: number | string;
  upgradeRequired?: PlanTier;
}

export interface PaywallInfo {
  planName: string;
  planTier: PlanTier;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  savings: number;
}

// ============================================================================
// SINGLETON EXPORTS
// ============================================================================

let stripeServiceInstance: StripeService | null = null;
let paywallServiceInstance: PaywallService | null = null;

export function getStripeService(): StripeService {
  if (!stripeServiceInstance) {
    stripeServiceInstance = new StripeService();
  }
  return stripeServiceInstance;
}

export function getPaywallService(): PaywallService {
  if (!paywallServiceInstance) {
    paywallServiceInstance = new PaywallService();
  }
  return paywallServiceInstance;
}

export default {
  StripeService,
  PaywallService,
  PLANS,
  getStripeService,
  getPaywallService,
};
