import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Email template interface
interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface EmailConfig {
  id: string;
  emailType: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  isActive: boolean;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    // Get email configuration from environment variables
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '', // Gmail App Password
      },
    };

    this.fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '';
    this.fromName = process.env.SMTP_FROM_NAME || 'BVisionRY Lighthouse';

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
      console.log('💡 Make sure SMTP environment variables are configured:');
      console.log('   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
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

      console.log(`📧 Sending email to: ${Array.isArray(to) ? to.join(', ') : to}`);
      console.log(`📧 Subject: ${subject}`);
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info.messageId);
      
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  // Convert HTML to plain text (basic implementation)
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  // Helper method to get user's current cohort
  private async getUserCohortId(userEmail: string): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: {
          cohortMembers: {
            where: {
              status: 'ENROLLED',
              cohort: {
                isActive: true
              }
            },
            include: {
              cohort: true
            },
            orderBy: {
              joinedAt: 'desc'
            },
            take: 1
          }
        }
      });

      if (user?.cohortMembers?.[0]) {
        return user.cohortMembers[0].cohortId;
      }

      return null;
    } catch (error) {
      console.error('Error getting user cohort:', error);
      return null;
    }
  }

  // Send welcome email to new users
  async sendWelcomeEmail(userEmail: string, userName: string, cohortId?: string): Promise<boolean> {
    // Auto-determine cohort if not provided
    const effectiveCohortId = cohortId || await this.getUserCohortId(userEmail) || undefined;
    const template = await this.getEmailTemplate('WELCOME', { userName, dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5177'}/dashboard` }, effectiveCohortId);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send password reset email
  async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetToken: string,
    cohortId?: string
  ): Promise<boolean> {
    // Auto-determine cohort if not provided
    const effectiveCohortId = cohortId || await this.getUserCohortId(userEmail) || undefined;
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5177'}/reset-password?token=${resetToken}`;
    const template = await this.getEmailTemplate('PASSWORD_RESET', { userName, resetUrl }, effectiveCohortId);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send answer submission notification
  async sendAnswerSubmissionEmail(
    userEmail: string,
    userName: string,
    questionTitle: string,
    questionNumber: number,
    cohortId?: string
  ): Promise<boolean> {
    // Auto-determine cohort if not provided
    const effectiveCohortId = cohortId || await this.getUserCohortId(userEmail) || undefined;
    const template = await this.getEmailTemplate('ANSWER_SUBMISSION', { 
      userName, 
      questionTitle, 
      questionNumber: questionNumber.toString(),
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5177'}/dashboard`
    }, effectiveCohortId);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send answer feedback email
  async sendAnswerFeedbackEmail(
    userEmail: string,
    userName: string,
    questionTitle: string,
    questionNumber: number,
    grade: string,
    feedback: string,
    cohortId?: string
  ): Promise<boolean> {
    // Auto-determine cohort if not provided
    const effectiveCohortId = cohortId || await this.getUserCohortId(userEmail) || undefined;
    const template = await this.getEmailTemplate('ANSWER_FEEDBACK', { 
      userName, 
      questionTitle, 
      questionNumber: questionNumber.toString(), 
      grade, 
      feedback,
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5177'}/dashboard`
    }, effectiveCohortId);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send new question release notification
  async sendNewQuestionEmail(
    userEmail: string,
    userName: string,
    questionTitle: string,
    questionNumber: number,
    cohortId?: string
  ): Promise<boolean> {
    // Auto-determine cohort if not provided
    const effectiveCohortId = cohortId || await this.getUserCohortId(userEmail) || undefined;
    const template = await this.getEmailTemplate('NEW_QUESTION', { 
      userName, 
      questionTitle, 
      questionNumber: questionNumber.toString(),
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5177'}/dashboard`
    }, effectiveCohortId);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send self-learning activity release notification
  async sendMiniQuestionReleaseEmail(
    userEmail: string,
    userName: string,
    miniQuestionTitle: string,
    contentTitle: string,
    questionTitle: string,
    cohortId?: string
  ): Promise<boolean> {
    // Auto-determine cohort if not provided
    const effectiveCohortId = cohortId || await this.getUserCohortId(userEmail) || undefined;
    const template = await this.getEmailTemplate('MINI_QUESTION_RELEASE', { 
      userName, 
      miniQuestionTitle, 
      contentTitle, 
      questionTitle,
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5177'}/dashboard`
    }, effectiveCohortId);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send mini-answer resubmission request notification
  async sendMiniAnswerResubmissionRequestEmail(
    userEmail: string,
    userName: string,
    miniQuestionTitle: string,
    contentTitle: string,
    questionTitle: string,
    cohortId?: string
  ): Promise<boolean> {
    // Auto-determine cohort if not provided
    const effectiveCohortId = cohortId || await this.getUserCohortId(userEmail) || undefined;
    const template = await this.getEmailTemplate('MINI_ANSWER_RESUBMISSION', { 
      userName, 
      miniQuestionTitle, 
      contentTitle, 
      questionTitle,
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5177'}/dashboard`
    }, effectiveCohortId);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send resubmission approval notification
  async sendResubmissionApprovalEmail(
    userEmail: string,
    userName: string,
    questionTitle: string,
    cohortId?: string
  ): Promise<boolean> {
    // Auto-determine cohort if not provided
    const effectiveCohortId = cohortId || await this.getUserCohortId(userEmail) || undefined;
    const template = await this.getEmailTemplate('RESUBMISSION_APPROVAL', { 
      userName, 
      questionTitle,
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5177'}/dashboard`
    }, effectiveCohortId);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send bulk emails to cohort users
  async sendBulkEmailToCohort(
    emails: string[],
    subject: string,
    html: string,
    text?: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Send emails in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      for (const email of batch) {
        const result = await this.sendEmail(email, subject, html, text);
        if (result) {
          success++;
        } else {
          failed++;
        }
      }
      
      // Add delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { success, failed };
  }

  // Get email template from cohort-specific config or fallback to global template
  private async getEmailTemplate(emailType: string, variables: Record<string, string>, cohortId?: string): Promise<EmailTemplate> {
    try {
      let config: EmailConfig | null = null;

      // Try to get cohort-specific config first
      if (cohortId) {
        const cohortConfig = await prisma.cohortEmailConfig.findUnique({
          where: {
            cohortId_emailType: {
              cohortId,
              emailType: emailType as any
            }
          }
        });

        if (cohortConfig) {
          config = {
            id: cohortConfig.id,
            emailType: cohortConfig.emailType,
            name: cohortConfig.name,
            subject: cohortConfig.subject,
            htmlContent: cohortConfig.htmlContent,
            textContent: cohortConfig.textContent || undefined,
            primaryColor: cohortConfig.primaryColor,
            secondaryColor: cohortConfig.secondaryColor,
            backgroundColor: cohortConfig.backgroundColor,
            textColor: cohortConfig.textColor,
            buttonColor: cohortConfig.buttonColor,
            isActive: cohortConfig.isActive
          };
        }
      }

      // Fallback to global template if no cohort-specific config found
      if (!config) {
        const globalTemplate = await prisma.globalEmailTemplate.findUnique({
          where: { emailType: emailType as any }
        });

        if (globalTemplate) {
          config = {
            id: globalTemplate.id,
            emailType: globalTemplate.emailType,
            name: globalTemplate.name,
            subject: globalTemplate.subject,
            htmlContent: globalTemplate.htmlContent,
            textContent: globalTemplate.textContent || undefined,
            primaryColor: globalTemplate.primaryColor,
            secondaryColor: globalTemplate.secondaryColor,
            backgroundColor: globalTemplate.backgroundColor,
            textColor: globalTemplate.textColor,
            buttonColor: globalTemplate.buttonColor,
            isActive: globalTemplate.isActive
          };
        }
      }

      // If still no config found, use fallback template
      if (!config) {
        console.warn(`No email configuration found for type ${emailType}, using fallback`);
        return this.getFallbackTemplate(emailType, variables);
      }

      // Process template with variables and colors
      const processedSubject = this.processTemplate(config.subject, variables);
      const processedHtml = this.processTemplate(config.htmlContent, {
        ...variables,
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        backgroundColor: config.backgroundColor,
        textColor: config.textColor,
        buttonColor: config.buttonColor
      });
      const processedText = config.textContent ? this.processTemplate(config.textContent, variables) : undefined;

      return {
        subject: processedSubject,
        html: processedHtml,
        text: processedText
      };
    } catch (error) {
      console.error(`Error getting email template for ${emailType}:`, error);
      return this.getFallbackTemplate(emailType, variables);
    }
  }

  // Process template string with variables
  private processTemplate(template: string, variables: Record<string, string>): string {
    let processed = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value);
    });
    return processed;
  }

  // Fallback templates (simplified versions of the old templates)
  private getFallbackTemplate(emailType: string, variables: Record<string, string>): EmailTemplate {
    switch (emailType) {
      case 'WELCOME':
        return {
          subject: 'Welcome to BVisionRY Lighthouse! 🚂',
          html: `<div>Welcome ${variables.userName || 'there'}!</div>`,
        };
      case 'PASSWORD_RESET':
        return {
          subject: 'Reset Your Password - BVisionRY Lighthouse',
          html: `<div>Hello ${variables.userName || 'there'}, <a href="${variables.resetUrl || '#'}">Reset your password</a></div>`,
        };
      case 'ANSWER_SUBMISSION':
        return {
          subject: `Answer Submitted - Question ${variables.questionNumber || ''} 📝`,
          html: `<div>Hello ${variables.userName || 'there'}, your answer for ${variables.questionTitle || 'the question'} has been submitted.</div>`,
        };
      case 'ANSWER_FEEDBACK':
        return {
          subject: `Feedback for Question ${variables.questionNumber || ''} - ${variables.grade || ''}`,
          html: `<div>Hello ${variables.userName || 'there'}, your answer for ${variables.questionTitle || 'the question'} has been graded: ${variables.grade || ''}. Feedback: ${variables.feedback || ''}</div>`,
        };
      case 'NEW_QUESTION':
        return {
          subject: `New Question Available - Question ${variables.questionNumber || ''} 🆕`,
          html: `<div>Hello ${variables.userName || 'there'}, new question available: ${variables.questionTitle || ''}</div>`,
        };
      case 'MINI_QUESTION_RELEASE':
        return {
          subject: `New Self-Learning Activity Available 📚`,
          html: `<div>Hello ${variables.userName || 'there'}, new activity: ${variables.miniQuestionTitle || ''} in ${variables.contentTitle || ''} for ${variables.questionTitle || ''}</div>`,
        };
      case 'MINI_ANSWER_RESUBMISSION':
        return {
          subject: `Resubmission Requested - ${variables.miniQuestionTitle || ''} 🔄`,
          html: `<div>Hello ${variables.userName || 'there'}, please resubmit: ${variables.miniQuestionTitle || ''}</div>`,
        };
      case 'RESUBMISSION_APPROVAL':
        return {
          subject: `Resubmission Approved - ${variables.questionTitle || ''} ✅`,
          html: `<div>Hello ${variables.userName || 'there'}, resubmission approved for: ${variables.questionTitle || ''}</div>`,
        };
      default:
        return {
          subject: 'Notification from BVisionRY Lighthouse',
          html: `<div>Hello ${variables.userName || 'there'}, you have a new notification.</div>`,
        };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
