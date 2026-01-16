import { Resend } from 'resend';
import { logger } from '@lib/logger';

// Interface for Email Service Configuration
interface EmailConfig {
  resendApiKey?: string;
  fromEmail?: string;
}

// Interface for Email Payload
interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string = 'Acme <onboarding@resend.dev>'; // Default Resend test email
  private isConfigured: boolean = false;

  constructor(config: EmailConfig = {}) {
    const apiKey = config.resendApiKey || process.env.RESEND_API_KEY;
    
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      if (config.fromEmail || process.env.EMAIL_FROM) {
        this.fromEmail = config.fromEmail || process.env.EMAIL_FROM || 'onboarding@resend.dev';
      }
    } else {
      logger.warn('EmailService: RESEND_API_KEY not found. Emails will be logged to console only.', { component: 'EmailService' });
    }
  }

  /**
   * Send an email using Resend or fallback to logger
   */
  private async sendEmail(payload: EmailPayload): Promise<boolean> {
    if (!this.resend || !this.isConfigured) {
      logger.info(`[Email Mock] To: ${payload.to} | Subject: ${payload.subject}`, {
        htmlPreview: payload.html.substring(0, 100) + '...',
        component: 'EmailService'
      });
      return true; // Simulate success
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text
      });

      if (error) {
        logger.error('EmailService: Failed to send email', new Error(error.message), { error, payload });
        return false;
      }

      logger.info(`EmailService: Email sent successfully to ${payload.to}`, { id: data?.id });
      return true;
    } catch (err) {
      logger.error('EmailService: Unexpected error sending email', err instanceof Error ? err : new Error(String(err)), { payload });
      return false;
    }
  }

  /**
   * Send Render Completed Email
   */
  async sendRenderCompleted(to: string, projectTitle: string, downloadUrl: string, duration: number) {
    const subject = `Your video "${projectTitle}" is ready!`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Video Rendered Successfully</h2>
        <p>Great news! Your video <strong>${projectTitle}</strong> has finished rendering.</p>
        <p><strong>Duration:</strong> ${Math.round(duration)} seconds</p>
        <div style="margin: 20px 0;">
          <a href="${downloadUrl}" style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Video</a>
        </div>
        <p>Or copy this link: <br> <a href="${downloadUrl}">${downloadUrl}</a></p>
      </div>
    `;
    
    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send Render Failed Email
   */
  async sendRenderFailed(to: string, projectTitle: string, errorMessage: string) {
    const subject = `Render failed for "${projectTitle}"`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e11d48;">Render Failed</h2>
        <p>We encountered an issue while rendering your video <strong>${projectTitle}</strong>.</p>
        <div style="background-color: #fca5a5; padding: 15px; border-radius: 5px; color: #7f1d1d; margin: 20px 0;">
          <strong>Error:</strong> ${errorMessage}
        </div>
        <p>Please try again or contact support if the issue persists.</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send Welcome Email
   */
  async sendWelcomeEmail(to: string, name: string) {
    const subject = `Welcome to Estudio IA!`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome, ${name}!</h2>
        <p>Thank you for joining Estudio IA. We are excited to help you create amazing AI-powered videos.</p>
        <p>Get started by creating your first project now.</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }
}

export const emailService = new EmailService();
