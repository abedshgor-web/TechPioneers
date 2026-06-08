import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY', 'test'));
    this.from = `${this.config.get('EMAIL_FROM_NAME', 'CRM Platform')} <${this.config.get('EMAIL_FROM', 'noreply@yourcrm.com')}>`;
  }

  async sendVerificationEmail(to: string, token: string, firstName: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const verifyUrl = `${appUrl}/auth/verify-email?token=${token}`;

    await this.send({
      to,
      subject: 'Verify your email — CRM Platform',
      html: `
        <h2>Hi ${firstName},</h2>
        <p>Welcome to CRM Platform! Please verify your email address to get started.</p>
        <p>
          <a href="${verifyUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
            Verify Email Address
          </a>
        </p>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't create an account, you can ignore this email.</p>
      `,
      text: `Hi ${firstName},\n\nVerify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
    });
  }

  async sendPasswordResetEmail(to: string, token: string, firstName: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

    await this.send({
      to,
      subject: 'Reset your password — CRM Platform',
      html: `
        <h2>Hi ${firstName},</h2>
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
            Reset Password
          </a>
        </p>
        <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      `,
      text: `Hi ${firstName},\n\nReset your password: ${resetUrl}\n\nExpires in 1 hour.`,
    });
  }

  async sendWelcomeEmail(to: string, firstName: string, tenantSlug: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const dashboardUrl = `${appUrl}/dashboard`;

    await this.send({
      to,
      subject: `Welcome to CRM Platform — your 14-day trial has started`,
      html: `
        <h2>Welcome aboard, ${firstName}! 🎉</h2>
        <p>Your 14-day free trial has started. Here's how to get the most out of it:</p>
        <ol>
          <li>Import your contacts (CSV or Gmail)</li>
          <li>Create your first deal in the pipeline</li>
          <li>Invite your team members</li>
        </ol>
        <p>
          <a href="${dashboardUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
            Go to Dashboard
          </a>
        </p>
        <p>Your workspace: <strong>${tenantSlug}.yourcrm.com</strong></p>
      `,
      text: `Welcome ${firstName}! Your 14-day trial has started. Dashboard: ${dashboardUrl}`,
    });
  }

  private async send(options: SendEmailOptions): Promise<void> {
    const isDev = this.config.get('NODE_ENV') !== 'production';
    const apiKey = this.config.get<string>('RESEND_API_KEY');

    if (isDev && (!apiKey || apiKey === 'test')) {
      this.logger.debug(`[DEV EMAIL] To: ${options.to} | Subject: ${options.subject}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}`, err);
    }
  }
}
