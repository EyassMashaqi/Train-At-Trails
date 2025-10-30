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
    // Skip verification if essential SMTP credentials are missing (development mode)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('⚠️ Email service disabled - SMTP credentials not configured');
      console.log('💡 Configure SMTP environment variables for email functionality:');
      console.log('   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
      return;
    }

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
    // Check if SMTP credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('⚠️ Email sending skipped - SMTP credentials not configured');
      console.log(`📧 Would have sent email to: ${Array.isArray(to) ? to.join(', ') : to}`);
      console.log(`📧 Subject: ${subject}`);
      return false;
    }

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

  // Send user assigned to cohort email
  async sendUserAssignedToCohortEmail(
    userEmail: string,
    userName: string,
    cohortName: string,
    cohortStartDate: string,
    userStatus: string,
    cohortId: string
  ): Promise<boolean> {
    const template = await this.getEmailTemplate('USER_ASSIGNED_TO_COHORT', { 
      userName, 
      cohortName,
      cohortStartDate,
      userStatus,
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5177'}/dashboard`
    }, cohortId);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send user graduated email
  async sendUserGraduatedEmail(
    userEmail: string,
    userName: string,
    cohortName: string,
    graduationDate: string,
    cohortId: string
  ): Promise<boolean> {
    const template = await this.getEmailTemplate('USER_GRADUATED', { 
      userName, 
      cohortName,
      graduationDate,
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5177'}/dashboard`
    }, cohortId);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send user removed from cohort email
  async sendUserRemovedFromCohortEmail(
    userEmail: string,
    userName: string,
    cohortName: string,
    userStatus: string,
    changeDate: string,
    changedBy: string,
    cohortId: string
  ): Promise<boolean> {
    const template = await this.getEmailTemplate('USER_REMOVED_FROM_COHORT', { 
      userName, 
      cohortName,
      userStatus,
      changeDate,
      changedBy,
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5177'}/dashboard`
    }, cohortId);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send user suspended email
  async sendUserSuspendedEmail(
    userEmail: string,
    userName: string,
    cohortName: string,
    changeDate: string,
    changedBy: string,
    cohortId: string
  ): Promise<boolean> {
    const template = await this.getEmailTemplate('USER_SUSPENDED', { 
      userName, 
      cohortName,
      changeDate,
      changedBy,
      dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5177'}/dashboard`
    }, cohortId);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send new user registration notification to admin
  async sendNewUserRegistrationNotificationToAdmin(
    userEmail: string,
    userName: string,
    registrationDate: string,
    adminNotificationEmail: string = `${process.env.SMTP_ADMIN_NOTIFICATION_EMAIL || 'razan@bvisionry.com'}`
  ): Promise<boolean> {
    const subject = `🆕 New User Registration - ${userName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e40af; margin: 0; font-size: 24px;">🚂 BVisionRY Lighthouse</h1>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">New User Registration Alert</p>
          </div>

          <!-- Main Content -->
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 25px;">
            <h2 style="color: #1e40af; margin: 0 0 15px 0; font-size: 20px;">👋 New User Has Joined!</h2>
            <p style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">
              A new user has successfully registered for the BVisionRY Lighthouse platform.
            </p>
          </div>

          <!-- User Details -->
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">📋 User Details:</h3>
            <div style="margin-bottom: 12px;">
              <span style="color: #6b7280; font-weight: 500;">Full Name:</span>
              <span style="color: #1f2937; margin-left: 10px; font-weight: 600;">${userName}</span>
            </div>
            <div style="margin-bottom: 12px;">
              <span style="color: #6b7280; font-weight: 500;">Email Address:</span>
              <span style="color: #1f2937; margin-left: 10px; font-weight: 600;">${userEmail}</span>
            </div>
            <div style="margin-bottom: 0;">
              <span style="color: #6b7280; font-weight: 500;">Registration Date:</span>
              <span style="color: #1f2937; margin-left: 10px; font-weight: 600;">${registrationDate}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5177'}/admin" 
               style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px;">
              🏮 View Admin Dashboard
            </a>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This is an automated notification from the BVisionRY Lighthouse system.
            </p>
            <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">
              🚂 All aboard the learning journey! 🌟
            </p>
          </div>
        </div>
      </div>
    `;

    const text = `
      New User Registration - BVisionRY Lighthouse
      
      A new user has registered for the platform:
      
      Name: ${userName}
      Email: ${userEmail}
      Registration Date: ${registrationDate}
      
      Visit the admin dashboard to manage users: ${process.env.FRONTEND_URL || 'http://localhost:5177'}
    `;

    return this.sendEmail(adminNotificationEmail, subject, html, text);
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
          subject: `New Question Available 🆕`,
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
      case 'USER_ASSIGNED_TO_COHORT':
        return {
          subject: `You Have Been Assigned to a New Cohort - ${variables.cohortName || ''} 🎉`,
          html: `<div>Hello ${variables.userName || 'there'}, you have been assigned to the cohort: ${variables.cohortName || ''}. Start date: ${variables.cohortStartDate || ''}. Status: ${variables.userStatus || ''}.</div>`,
        };
      case 'USER_GRADUATED':
        return {
          subject: `Congratulations on Your Graduation! 🎓`,
          html: `<div>Hello ${variables.userName || 'there'}, congratulations on graduating from the cohort: ${variables.cohortName || ''}!</div>`,
        };
      case 'USER_REMOVED_FROM_COHORT':
        return {
          subject: `You Have Been Removed From a Cohort - ${variables.cohortName || ''} ⚠️`,
          html: `<div>Hello ${variables.userName || 'there'}, you have been removed from the cohort: ${variables.cohortName || ''}. Status: ${variables.userStatus || ''}. Change date: ${variables.changeDate || ''}.</div>`,
        };
      case 'USER_SUSPENDED':
        return {
          subject: `Your Account Has Been Suspended ⚠️`,
          html: `<div>Hello ${variables.userName || 'there'}, your account has been suspended. Please contact support for more information.</div>`,
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
