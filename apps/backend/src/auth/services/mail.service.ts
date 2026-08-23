import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AppConfigService } from '../../core/config/app-config.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: AppConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: config.smtpUser
        ? { user: config.smtpUser, pass: config.smtpPass }
        : undefined,
    });
  }

  async sendEmailVerificationOtp(
    to: string,
    otp: string,
    ttlMinutes: number,
  ): Promise<void> {
    const subject = 'Your ftaar verification code';
    const text =
      `Your email verification code is: ${otp}\n\n` +
      `This code expires in ${ttlMinutes} minute${ttlMinutes === 1 ? '' : 's'}.\n\n` +
      `If you did not request this, you can safely ignore this email.`;

    await this.send(to, subject, text);
  }

  async sendPasswordResetOtp(
    to: string,
    otp: string,
    ttlMinutes: number,
  ): Promise<void> {
    const subject = 'Your ftaar password reset code';
    const text =
      `Your password reset code is: ${otp}\n\n` +
      `This code expires in ${ttlMinutes} minute${ttlMinutes === 1 ? '' : 's'}.\n\n` +
      `If you did not request a password reset, please ignore this email and your password will remain unchanged.`;

    await this.send(to, subject, text);
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.mailFrom,
        to,
        subject,
        text,
      });
    } catch (err) {
      // In development, print the email content to stdout instead of crashing
      if (!this.config.isProduction) {
        // Use process.stdout so it's always visible regardless of log level
        process.stdout.write(
          `\n${'═'.repeat(60)}\n` +
            `📧  DEV MAIL  →  ${to}\n` +
            `Subject: ${subject}\n` +
            `${'─'.repeat(60)}\n` +
            `${text}\n` +
            `${'═'.repeat(60)}\n\n`,
        );
      } else {
        throw err;
      }
    }
  }
}
