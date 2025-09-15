import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Email template interface
interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@bvisionrytrainings.com';
    this.fromName = process.env.SMTP_FROM_NAME || 'BVisionRY Lighthouse';

    console.log('📧 Email Service initialized (Mock Mode)');
  }

  // Send a generic email (mock implementation)
  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    text?: string
  ): Promise<boolean> {
    try {
      console.log('📧 [MOCK] Email would be sent:');
      console.log(`   To: ${Array.isArray(to) ? to.join(', ') : to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   From: "${this.fromName}" <${this.fromEmail}>`);
      
      // Simulate email delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('❌ Mock email service error:', error);
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

  // Send self-learning activity release notification
  async sendMiniQuestionReleaseEmail(
    userEmail: string,
    userName: string,
    miniQuestionTitle: string,
    contentTitle: string,
    questionTitle: string
  ): Promise<boolean> {
    const template = this.getMiniQuestionReleaseTemplate(userName, miniQuestionTitle, contentTitle, questionTitle);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send mini-answer resubmission request notification
  async sendMiniAnswerResubmissionRequestEmail(
    userEmail: string,
    userName: string,
    miniQuestionTitle: string,
    contentTitle: string,
    questionTitle: string
  ): Promise<boolean> {
    const template = this.getMiniAnswerResubmissionTemplate(userName, miniQuestionTitle, contentTitle, questionTitle);
    return this.sendEmail(userEmail, template.subject, template.html, template.text);
  }

  // Send resubmission approval notification
  async sendResubmissionApprovalEmail(
    userEmail: string,
    userName: string,
    questionTitle: string
  ): Promise<boolean> {
    const template = this.getResubmissionApprovalTemplate(userName, questionTitle);
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

  // Email Templates
  private getWelcomeTemplate(userName: string): EmailTemplate {
    return {
      subject: 'Welcome to BVisionRY Lighthouse! 🚂',
      html: `<div>Welcome ${userName}!</div>`,
    };
  }

  private getPasswordResetTemplate(userName: string, resetToken: string): EmailTemplate {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5177'}/reset-password?token=${resetToken}`;
    return {
      subject: 'Reset Your Password - BVisionRY Lighthouse',
      html: `<div>Hello ${userName}, <a href="${resetUrl}">Reset your password</a></div>`,
    };
  }

  private getAnswerSubmissionTemplate(userName: string, questionTitle: string, questionNumber: number): EmailTemplate {
    return {
      subject: `Answer Submitted - Question ${questionNumber} 📝`,
      html: `<div>Hello ${userName}, your answer for ${questionTitle} has been submitted.</div>`,
    };
  }

  private getAnswerFeedbackTemplate(
    userName: string,
    questionTitle: string,
    questionNumber: number,
    grade: string,
    feedback: string
  ): EmailTemplate {
    return {
      subject: `Feedback for Question ${questionNumber} - ${grade}`,
      html: `<div>Hello ${userName}, your answer for ${questionTitle} has been graded: ${grade}. Feedback: ${feedback}</div>`,
    };
  }

  private getNewQuestionTemplate(userName: string, questionTitle: string, questionNumber: number): EmailTemplate {
    return {
      subject: `New Question Available - Question ${questionNumber} 🆕`,
      html: `<div>Hello ${userName}, new question available: ${questionTitle}</div>`,
    };
  }

  private getMiniQuestionReleaseTemplate(
    userName: string,
    miniQuestionTitle: string,
    contentTitle: string,
    questionTitle: string
  ): EmailTemplate {
    return {
      subject: `New Self-Learning Activity Available 📚`,
      html: `<div>Hello ${userName}, new activity: ${miniQuestionTitle} in ${contentTitle} for ${questionTitle}</div>`,
    };
  }

  private getMiniAnswerResubmissionTemplate(
    userName: string,
    miniQuestionTitle: string,
    contentTitle: string,
    questionTitle: string
  ): EmailTemplate {
    return {
      subject: `Resubmission Requested - ${miniQuestionTitle} 🔄`,
      html: `<div>Hello ${userName}, please resubmit: ${miniQuestionTitle}</div>`,
    };
  }

  private getResubmissionApprovalTemplate(userName: string, questionTitle: string): EmailTemplate {
    return {
      subject: `Resubmission Approved - ${questionTitle} ✅`,
      html: `<div>Hello ${userName}, resubmission approved for: ${questionTitle}</div>`,
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
