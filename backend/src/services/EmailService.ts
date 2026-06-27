import nodemailer from 'nodemailer';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@pulseops.dev';
const FROM_NAME = 'PulseOps Incident Response';

// Create transporter - returns null if not configured (falls back to console logging)
function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  // In development with no email config, return null to use console fallback
  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user, pass },
  });
}

export class EmailService {
  /**
   * Send a password reset email to the user
   * @param email - recipient email (fetched from user data)
   * @param resetLink - the password reset URL
   * @param userName - the user's name for personalization
   */
  static async sendPasswordReset(email: string, resetLink: string, userName: string): Promise<boolean> {
    const transporter = getTransporter();

    if (!transporter) {
      // Fallback: log the reset link to console in development
      logger.info('Email transport not configured — logging reset link to console');
      console.log('');
      console.log('╔══════════════════════════════════════════════════════════╗');
      console.log('║         🔐 PASSWORD RESET LINK (DEV MODE)              ║');
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log(`║  User: ${userName.padEnd(47)}║`);
      console.log(`║  Email: ${email.padEnd(46)}║`);
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log(`║  ${resetLink}`);
      console.log('╚══════════════════════════════════════════════════════════╝');
      console.log('');
      return false;
    }

    try {
      await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: email,
        subject: 'Reset your PulseOps password',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0A0C10; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="color: #00D4FF; font-size: 24px; font-weight: 700;">PulseOps</span>
            </div>
            <h1 style="color: #E8EBF0; font-size: 20px; margin-bottom: 12px;">Password Reset</h1>
            <p style="color: #6B7A99; font-size: 14px; line-height: 1.6;">
              Hi ${userName},<br /><br />
              We received a request to reset your PulseOps account password. Click the button below to set a new password. This link expires in 1 hour.
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${resetLink}" style="display: inline-block; padding: 12px 32px; background: #00D4FF; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Reset Password
              </a>
            </div>
            <p style="color: #6B7A99; font-size: 12px;">
              If you didn't request this, you can safely ignore this email.<br />
              <a href="${resetLink}" style="color: #00D4FF;">${resetLink}</a>
            </p>
          </div>
        `,
      });
      logger.info(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Send an email verification link to the user
   * @param email - recipient email (fetched from user data)
   * @param verifyLink - the email verification URL
   * @param userName - the user's name for personalization
   */
  static async sendEmailVerification(email: string, verifyLink: string, userName: string): Promise<boolean> {
    const transporter = getTransporter();

    if (!transporter) {
      logger.info('Email transport not configured — logging verification link to console');
      console.log('');
      console.log('╔══════════════════════════════════════════════════════════╗');
      console.log('║     📧 EMAIL VERIFICATION LINK (DEV MODE)              ║');
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log(`║  User: ${userName.padEnd(47)}║`);
      console.log(`║  Email: ${email.padEnd(46)}║`);
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log(`║  ${verifyLink}`);
      console.log('╚══════════════════════════════════════════════════════════╝');
      console.log('');
      return false;
    }

    try {
      await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: email,
        subject: 'Verify your PulseOps email address',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0A0C10; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="color: #00D4FF; font-size: 24px; font-weight: 700;">PulseOps</span>
            </div>
            <h1 style="color: #E8EBF0; font-size: 20px; margin-bottom: 12px;">Verify Your Email</h1>
            <p style="color: #6B7A99; font-size: 14px; line-height: 1.6;">
              Hi ${userName},<br /><br />
              Thanks for signing up! Please verify your email address by clicking the button below.
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${verifyLink}" style="display: inline-block; padding: 12px 32px; background: #00D4FF; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Verify Email
              </a>
            </div>
            <p style="color: #6B7A99; font-size: 12px;">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        `,
      });
      logger.info(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      return false;
    }
  }
}
