import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultEmailTemplates = [
  {
    emailType: 'WELCOME',
    name: 'Welcome Email',
    description: 'Sent to new users when they register',
    subject: 'Welcome to BVisionRY Lighthouse! 🚂',
    htmlContent: `<div style="background-color: {{backgroundColor}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primaryColor}}; text-align: center;">Welcome {{userName}}! 🚂</h1>
    <p style="color: {{textColor}}; font-size: 16px;">Welcome to BVisionRY Lighthouse training program!</p>
    <p style="color: {{textColor}}; font-size: 16px;">We are excited to have you on board. Get ready for an amazing learning journey!</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
    </div>
  </div>
</div>`,
    textContent: 'Welcome {{userName}}! Welcome to BVisionRY Lighthouse training program! We are excited to have you on board. Get ready for an amazing learning journey! Go to Dashboard: {{dashboardUrl}}'
  },
  {
    emailType: 'PASSWORD_RESET',
    name: 'Password Reset Email',
    description: 'Sent when users request password reset',
    subject: 'Reset Your Password - BVisionRY Lighthouse',
    htmlContent: `<div style="background-color: {{backgroundColor}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primaryColor}}; text-align: center;">Password Reset Request</h1>
    <p style="color: {{textColor}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{textColor}}; font-size: 16px;">We received a request to reset your password. Click the button below to reset it:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{resetUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
    </div>
    <p style="color: {{textColor}}; font-size: 14px;">If you did not request this, please ignore this email.</p>
  </div>
</div>`,
    textContent: 'Hello {{userName}}, We received a request to reset your password. Click the link to reset it: {{resetUrl}}. If you did not request this, please ignore this email.'
  },
  {
    emailType: 'ANSWER_SUBMISSION',
    name: 'Answer Submission Email',
    description: 'Sent when users submit answers',
    subject: 'Answer Submitted - Question {{questionNumber}} 📝',
    htmlContent: `<div style="background-color: {{backgroundColor}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primaryColor}}; text-align: center;">Answer Submitted! 📝</h1>
    <p style="color: {{textColor}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{textColor}}; font-size: 16px;">Your answer for <strong>{{questionTitle}}</strong> has been successfully submitted.</p>
    <p style="color: {{textColor}}; font-size: 16px;">We will review your submission and provide feedback soon.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
    </div>
  </div>
</div>`,
    textContent: 'Hello {{userName}}, Your answer for {{questionTitle}} has been successfully submitted. We will review your submission and provide feedback soon. View Dashboard: {{dashboardUrl}}'
  },
  {
    emailType: 'ANSWER_FEEDBACK',
    name: 'Answer Feedback Email',
    description: 'Sent when answers are graded',
    subject: 'Feedback for Question {{questionNumber}} - {{grade}}',
    htmlContent: `<div style="background-color: {{backgroundColor}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primaryColor}}; text-align: center;">Answer Feedback</h1>
    <p style="color: {{textColor}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{textColor}}; font-size: 16px;">Your answer for <strong>{{questionTitle}}</strong> has been reviewed.</p>
    <div style="background-color: {{secondaryColor}}; color: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin: 0; text-align: center;">Grade: {{grade}}</h3>
    </div>
    <p style="color: {{textColor}}; font-size: 16px;"><strong>Feedback:</strong></p>
    <p style="color: {{textColor}}; font-size: 16px;">{{feedback}}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
    </div>
  </div>
</div>`,
    textContent: 'Hello {{userName}}, Your answer for {{questionTitle}} has been reviewed. Grade: {{grade}}. Feedback: {{feedback}}. View Dashboard: {{dashboardUrl}}'
  },
  {
    emailType: 'NEW_QUESTION',
    name: 'New Question Email',
    description: 'Sent when new questions are released',
    subject: 'New Question Available - Question {{questionNumber}} 🆕',
    htmlContent: `<div style="background-color: {{backgroundColor}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primaryColor}}; text-align: center;">New Question Available! 🆕</h1>
    <p style="color: {{textColor}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{textColor}}; font-size: 16px;">A new question is now available: <strong>{{questionTitle}}</strong></p>
    <p style="color: {{textColor}}; font-size: 16px;">Get ready to continue your learning journey!</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Answer Now</a>
    </div>
  </div>
</div>`,
    textContent: 'Hello {{userName}}, A new question is now available: {{questionTitle}}. Get ready to continue your learning journey! Answer Now: {{dashboardUrl}}'
  },
  {
    emailType: 'MINI_QUESTION_RELEASE',
    name: 'Mini Question Release Email',
    description: 'Sent when self-learning activities are released',
    subject: 'New Self-Learning Activity Available 📚',
    htmlContent: `<div style="background-color: {{backgroundColor}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primaryColor}}; text-align: center;">New Self-Learning Activity! 📚</h1>
    <p style="color: {{textColor}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{textColor}}; font-size: 16px;">A new self-learning activity is available:</p>
    <div style="background-color: {{secondaryColor}}; color: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin: 0;">{{miniQuestionTitle}}</h3>
      <p style="margin: 5px 0 0 0;">Content: {{contentTitle}}</p>
      <p style="margin: 5px 0 0 0;">Question: {{questionTitle}}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Start Activity</a>
    </div>
  </div>
</div>`,
    textContent: 'Hello {{userName}}, A new self-learning activity is available: {{miniQuestionTitle}}. Content: {{contentTitle}}. Question: {{questionTitle}}. Start Activity: {{dashboardUrl}}'
  },
  {
    emailType: 'MINI_ANSWER_RESUBMISSION',
    name: 'Mini Answer Resubmission Email',
    description: 'Sent when resubmission is requested',
    subject: 'Resubmission Requested - {{miniQuestionTitle}} 🔄',
    htmlContent: `<div style="background-color: {{backgroundColor}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primaryColor}}; text-align: center;">Resubmission Requested 🔄</h1>
    <p style="color: {{textColor}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{textColor}}; font-size: 16px;">Please resubmit your answer for: <strong>{{miniQuestionTitle}}</strong></p>
    <p style="color: {{textColor}}; font-size: 16px;">Content: {{contentTitle}}</p>
    <p style="color: {{textColor}}; font-size: 16px;">Question: {{questionTitle}}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Resubmit Now</a>
    </div>
  </div>
</div>`,
    textContent: 'Hello {{userName}}, Please resubmit your answer for: {{miniQuestionTitle}}. Content: {{contentTitle}}. Question: {{questionTitle}}. Resubmit Now: {{dashboardUrl}}'
  },
  {
    emailType: 'RESUBMISSION_APPROVAL',
    name: 'Resubmission Approval Email',
    description: 'Sent when resubmissions are approved',
    subject: 'Resubmission Approved - {{questionTitle}} ✅',
    htmlContent: `<div style="background-color: {{backgroundColor}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primaryColor}}; text-align: center;">Resubmission Approved! ✅</h1>
    <p style="color: {{textColor}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{textColor}}; font-size: 16px;">Your resubmission for <strong>{{questionTitle}}</strong> has been approved!</p>
    <p style="color: {{textColor}}; font-size: 16px;">Congratulations on your persistence and improvement!</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
    </div>
  </div>
</div>`,
    textContent: 'Hello {{userName}}, Your resubmission for {{questionTitle}} has been approved! Congratulations on your persistence and improvement! View Dashboard: {{dashboardUrl}}'
  }
];

async function seedEmailTemplates() {
  console.log('🌱 Seeding email templates...');
  
  try {
    for (const template of defaultEmailTemplates) {
      await prisma.globalEmailTemplate.upsert({
        where: { emailType: template.emailType as any },
        update: {
          name: template.name,
          description: template.description,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          // Keep existing colors and active status, only update content
        },
        create: {
          emailType: template.emailType as any,
          name: template.name,
          description: template.description,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          backgroundColor: '#F8FAFC',
          textColor: '#1F2937',
          buttonColor: '#3B82F6',
          isActive: true
        }
      });
      console.log(`✅ Updated/Created template: ${template.name}`);
    }
    
    console.log('🎉 Email templates seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding email templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedEmailTemplates();