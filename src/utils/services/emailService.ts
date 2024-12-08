import nodemailer from 'nodemailer';
import { config } from '../../config';
import { ErrorBuilder } from '../errors/ErrorBuilder';
import { logger } from '../helpers/logger';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
      service: 'gmail',
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        text,
        html,
      });
      logger.info(`Email sent to ${to}`);
    } catch (error) {
      logger.error('Error sending email:', error);
      throw ErrorBuilder.internal('Failed to send email');
    }
  }

  async sendVerificationEmail(email: string, token: string) {
    const appUrl = config.baseUrl;
    const verificationLink = `${appUrl}/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: `"Content Generator" <noreply@contentgen.com>`,
      to: email,
      subject: 'Verify Your Email',
      html: `
        <h1>Welcome to Content Generator!</h1>
        <p>Please click the link below to verify your email:</p>
        <a href="${verificationLink}">${verificationLink}</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    await this.sendEmail(
      mailOptions.to,
      mailOptions.subject,
      verificationLink,
      mailOptions.html
    );
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const url = config.appUrl;
    const resetLink = `${url}/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Content Generator" <noreply@contentgen.com>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <h1>Password Reset Request</h1>
        <p>You have requested to reset your password. Please click the link below to set a new password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      `,
    };

    await this.sendEmail(
      mailOptions.to,
      mailOptions.subject,
      resetLink,
      mailOptions.html
    );
  }

  async sendTrialEndingEmail(email: string) {
    const url = config.appUrl;
    const trialLink = `${url}/subscription/trial-upgrade`
  }
}

export const emailService = new EmailService();
