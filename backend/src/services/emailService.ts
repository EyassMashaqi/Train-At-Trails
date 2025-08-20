import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email template interface
interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    // Get email configuration from environment variables
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '', // Gmail App Password
      },
    };

    this.fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '';
    this.fromName = process.env.SMTP_FROM_NAME || 'Train at Trails';

    // Create transporter
    this.transporter = nodemailer.createTransport(emailConfig);


    // Verify connection configuration
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready to send emails');
    } catch (error) {
      console.error('❌ Email service configuration error:', error);
    }
  }

  // Send a generic email
  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    text?: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        text: text || this.htmlToText(html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  // Send welcome email to new users
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const template = this.getWelcomeTemplate(userName);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send password reset email
  async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetToken: string
  ): Promise<boolean> {
    const template = this.getPasswordResetTemplate(userName, resetToken);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send answer submission notification
  async sendAnswerSubmissionEmail(
    userEmail: string,
    userName: string,
    questionTitle: string,
    questionNumber: number
  ): Promise<boolean> {
    const template = this.getAnswerSubmissionTemplate(userName, questionTitle, questionNumber);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send answer feedback email
  async sendAnswerFeedbackEmail(
    userEmail: string,
    userName: string,
    questionTitle: string,
    questionNumber: number,
    grade: string,
    feedback: string
  ): Promise<boolean> {
    const template = this.getAnswerFeedbackTemplate(userName, questionTitle, questionNumber, grade, feedback);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send new question release notification
  async sendNewQuestionEmail(
    userEmail: string,
    userName: string,
    questionTitle: string,
    questionNumber: number
  ): Promise<boolean> {
    const template = this.getNewQuestionTemplate(userName, questionTitle, questionNumber);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Email Templates
  private getWelcomeTemplate(userName: string): EmailTemplate {
    return {
      subject: 'Welcome to Train at Trails! 🚂',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">Welcome to Train at Trails! 🚂</h1>
            <p style="color: #64748b; font-size: 16px;">Your learning journey begins now</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-bottom: 15px;">Hello ${userName}!</h2>
            <p style="color: #475569; line-height: 1.6;">
              Welcome to the BVisionRY Lighthouse training platform! We're excited to have you aboard.
              Get ready for an engaging learning experience where you'll tackle challenges, earn medals, 
              and advance through your training journey.
            </p>
          </div>

          <div style="background: #eff6ff; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: #1d4ed8; margin-bottom: 10px;">What's Next?</h3>
            <ul style="color: #475569; line-height: 1.6;">
              <li>Log in to your dashboard</li>
              <li>Check out your first training module</li>
              <li>Start answering questions to earn medals</li>
              <li>Track your progress on the leaderboard</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Start Your Journey
            </a>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 14px;">
              Happy learning!<br>
              The Train at Trails Team
            </p>
          </div>
        </div>
      `,
    };
  }

  private getPasswordResetTemplate(userName: string, resetToken: string): EmailTemplate {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    return {
      subject: 'Reset Your Password - Train at Trails',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin-bottom: 10px;">Password Reset Request</h1>
            <p style="color: #64748b; font-size: 16px;">Reset your Train at Trails password</p>
          </div>
          
          <div style="background: #fef2f2; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
            <h2 style="color: #1e293b; margin-bottom: 15px;">Hello ${userName},</h2>
            <p style="color: #475569; line-height: 1.6;">
              We received a request to reset your password. Click the button below to create a new password.
              This link will expire in 1 hour for security reasons.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>

          <div style="background: #fffbeb; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email. 
              Your password will remain unchanged.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 14px;">
              The Train at Trails Team
            </p>
          </div>
        </div>
      `,
    };
  }

  private getAnswerSubmissionTemplate(userName: string, questionTitle: string, questionNumber: number): EmailTemplate {
    return {
      subject: `Answer Submitted - Question ${questionNumber} 📝`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin-bottom: 10px;">Answer Submitted Successfully! ✅</h1>
            <p style="color: #64748b; font-size: 16px;">Your response is being reviewed</p>
          </div>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #059669;">
            <h2 style="color: #1e293b; margin-bottom: 15px;">Great job, ${userName}!</h2>
            <p style="color: #475569; line-height: 1.6;">
              Your answer for <strong>Question ${questionNumber}: ${questionTitle}</strong> has been submitted successfully 
              and is now being reviewed by our team.
            </p>
          </div>

          <div style="background: #eff6ff; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: #1d4ed8; margin-bottom: 10px;">What happens next?</h3>
            <ul style="color: #475569; line-height: 1.6;">
              <li>Our team will review your submission</li>
              <li>You'll receive feedback and a grade (🥇 Gold, 🥈 Silver, 🥉 Copper)</li>
              <li>Your progress will be updated on the dashboard</li>
              <li>Keep working on other available questions!</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Dashboard
            </a>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 14px;">
              Keep up the great work!<br>
              The Train at Trails Team
            </p>
          </div>
        </div>
      `,
    };
  }

  private getAnswerFeedbackTemplate(
    userName: string,
    questionTitle: string,
    questionNumber: number,
    grade: string,
    feedback: string
  ): EmailTemplate {
    const gradeEmojis: { [key: string]: string } = {
      'GOLD': '🥇',
      'SILVER': '🥈',
      'COPPER': '🥉',
      'NEEDS_RESUBMISSION': '❌'
    };

    const gradeColors: { [key: string]: string } = {
      'GOLD': '#f59e0b',
      'SILVER': '#6b7280',
      'COPPER': '#ea580c',
      'NEEDS_RESUBMISSION': '#dc2626'
    };

    const emoji = gradeEmojis[grade] || '📝';
    const color = gradeColors[grade] || '#2563eb';

    return {
      subject: `Feedback Received - Question ${questionNumber} ${emoji}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: ${color}; margin-bottom: 10px;">Feedback Received! ${emoji}</h1>
            <p style="color: #64748b; font-size: 16px;">Your answer has been reviewed</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-bottom: 15px;">Hello ${userName},</h2>
            <p style="color: #475569; line-height: 1.6;">
              Your answer for <strong>Question ${questionNumber}: ${questionTitle}</strong> has been reviewed.
            </p>
          </div>

          <div style="background: linear-gradient(135deg, ${color}20, ${color}10); padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid ${color};">
            <h3 style="color: ${color}; margin-bottom: 10px; display: flex; align-items: center;">
              <span style="font-size: 24px; margin-right: 10px;">${emoji}</span>
              Grade: ${grade.replace('_', ' ')}
            </h3>
          </div>

          <div style="background: #fffbeb; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h4 style="color: #92400e; margin-bottom: 10px;">Feedback:</h4>
            <p style="color: #451a03; line-height: 1.6; font-style: italic;">
              "${feedback}"
            </p>
          </div>

          ${grade === 'NEEDS_RESUBMISSION' ? `
          <div style="background: #fef2f2; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h4 style="color: #dc2626; margin-bottom: 10px;">Action Required:</h4>
            <p style="color: #7f1d1d; line-height: 1.6;">
              Please review the feedback and resubmit your answer to continue your progress.
            </p>
          </div>
          ` : ''}

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Dashboard
            </a>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 14px;">
              Keep learning and growing!<br>
              The Train at Trails Team
            </p>
          </div>
        </div>
      `,
    };
  }

  private getNewQuestionTemplate(userName: string, questionTitle: string, questionNumber: number): EmailTemplate {
    return {
      subject: `New Question Available - Question ${questionNumber} 🎯`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">New Question Available! 🎯</h1>
            <p style="color: #64748b; font-size: 16px;">Ready for your next challenge?</p>
          </div>
          
          <div style="background: #eff6ff; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #2563eb;">
            <h2 style="color: #1e293b; margin-bottom: 15px;">Hello ${userName},</h2>
            <p style="color: #475569; line-height: 1.6;">
              A new question is now available for you to tackle!
            </p>
            <h3 style="color: #1d4ed8; margin: 15px 0;">Question ${questionNumber}: ${questionTitle}</h3>
          </div>

          <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: #059669; margin-bottom: 10px;">🏆 Earn Your Medal!</h3>
            <p style="color: #065f46; line-height: 1.6;">
              Submit a high-quality answer to earn your medal:
            </p>
            <ul style="color: #065f46; line-height: 1.6;">
              <li>🥇 <strong>Gold Medal</strong> - Exceptional work that exceeds expectations</li>
              <li>🥈 <strong>Silver Medal</strong> - Good work that meets expectations well</li>
              <li>🥉 <strong>Copper Medal</strong> - Satisfactory work that meets basic requirements</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Answer Question
            </a>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 14px;">
              Good luck with your answer!<br>
              The Train at Trails Team
            </p>
          </div>
        </div>
      `,
    };
  }

  // Utility function to convert HTML to plain text
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
