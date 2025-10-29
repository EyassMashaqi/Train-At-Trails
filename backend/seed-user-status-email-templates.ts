import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const userStatusEmailTemplates = [
  {
    emailType: 'USER_ASSIGNED_TO_COHORT',
    name: 'User Assigned to Cohort',
    description: 'Sent when a user is assigned to a cohort',
    subject: 'Welcome to {{cohortName}} - Your Learning Journey Begins! 🚂',
    htmlContent: `<div style="background-color: {{backgroundColor}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: {{primaryColor}}; margin: 0;">🚂 All Aboard! 🚂</h1>
      <h2 style="color: {{secondaryColor}}; margin: 10px 0;">Welcome to {{cohortName}}</h2>
    </div>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">Hello {{userName}},</p>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      Congratulations! You have been assigned to <strong>{{cohortName}}</strong> in the BVisionRY Lighthouse training program. 
      Your train is ready to embark on an exciting learning journey!
    </p>
    
    <div style="background-color: {{secondaryColor}}; color: white; padding: 20px; border-radius: 6px; margin: 25px 0;">
      <h3 style="margin: 0 0 10px 0; text-align: center;">🎯 Your Cohort Details</h3>
      <p style="margin: 5px 0;"><strong>Cohort:</strong> {{cohortName}}</p>
      <p style="margin: 5px 0;"><strong>Start Date:</strong> {{cohortStartDate}}</p>
      <p style="margin: 5px 0;"><strong>Your Role:</strong> Trainee</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> {{userStatus}}</p>
    </div>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      🌟 What happens next:
    </p>
    <ul style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      <li>Access your personalized dashboard</li>
      <li>Start with your first questions when they become available</li>
      <li>Track your progress along the learning trail</li>
      <li>Connect with your cohort members</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">🚀 Start Your Journey</a>
    </div>
    
    <p style="color: {{textColor}}; font-size: 14px; text-align: center; margin-top: 30px;">
      Ready to learn, grow, and succeed? Your adventure begins now!
    </p>
  </div>
</div>`,
    textContent: 'Hello {{userName}}, Congratulations! You have been assigned to {{cohortName}} in the BVisionRY Lighthouse training program. Your train is ready to embark on an exciting learning journey! Cohort Details - Cohort: {{cohortName}}, Start Date: {{cohortStartDate}}, Status: {{userStatus}}. Access your dashboard: {{dashboardUrl}}'
  },
  {
    emailType: 'USER_GRADUATED',
    name: 'User Graduated',
    description: 'Sent when a user graduates from their cohort',
    subject: '🎓 Congratulations! You\'ve Graduated from {{cohortName}} 🚂',
    htmlContent: `<div style="background-color: {{backgroundColor}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: {{primaryColor}}; margin: 0; font-size: 32px;">🎓 CONGRATULATIONS! 🎓</h1>
      <h2 style="color: {{secondaryColor}}; margin: 10px 0;">You've Graduated!</h2>
    </div>
    
    <p style="color: {{textColor}}; font-size: 18px; line-height: 1.6; text-align: center;">
      <strong>{{userName}}, you did it!</strong>
    </p>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      We are thrilled to inform you that you have successfully completed the <strong>{{cohortName}}</strong> 
      training program in BVisionRY Lighthouse! Your dedication, hard work, and persistence have paid off.
    </p>
    
    <div style="background-color: linear-gradient(135deg, {{secondaryColor}}, {{primaryColor}}); color: white; padding: 25px; border-radius: 10px; margin: 25px 0; text-align: center;">
      <h3 style="margin: 0 0 15px 0;">🏆 Achievement Unlocked</h3>
      <p style="margin: 5px 0; font-size: 18px;"><strong>Program:</strong> {{cohortName}}</p>
      <p style="margin: 5px 0;"><strong>Completion Date:</strong> {{graduationDate}}</p>
      <p style="margin: 5px 0;"><strong>Final Status:</strong> GRADUATED ✅</p>
      <p style="margin: 15px 0 0 0; font-size: 20px;">🚂 → 🏁</p>
    </div>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      🌟 <strong>Your accomplishments:</strong>
    </p>
    <ul style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      <li>Completed all required modules and questions</li>
      <li>Demonstrated mastery of key concepts</li>
      <li>Successfully navigated the entire learning trail</li>
      <li>Earned your place among our graduates</li>
    </ul>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      This achievement marks not just the end of this program, but the beginning of applying what you've learned. 
      Take pride in your journey and continue building on this foundation.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">🎉 View Your Achievement</a>
    </div>
    
    <p style="color: {{textColor}}; font-size: 14px; text-align: center; margin-top: 30px; font-style: italic;">
      "Success is not final, failure is not fatal: it is the courage to continue that counts." - Keep learning!
    </p>
  </div>
</div>`,
    textContent: 'Congratulations {{userName}}! You have successfully completed the {{cohortName}} training program in BVisionRY Lighthouse! Completion Date: {{graduationDate}}, Final Status: GRADUATED. Your dedication, hard work, and persistence have paid off. View your achievement: {{dashboardUrl}}'
  },
  {
    emailType: 'USER_REMOVED_FROM_COHORT',
    name: 'User Removed from Cohort',
    description: 'Sent when a user is removed from their cohort',
    subject: 'Important Notice: Changes to Your {{cohortName}} Enrollment',
    htmlContent: `<div style="background-color: {{backgroundColor}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: {{primaryColor}}; margin: 0;">📋 Enrollment Update</h1>
      <h2 style="color: {{secondaryColor}}; margin: 10px 0;">{{cohortName}}</h2>
    </div>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">Hello {{userName}},</p>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      We are writing to inform you that your enrollment in <strong>{{cohortName}}</strong> 
      has been updated by our administrative team.
    </p>
    
    <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin: 25px 0;">
      <h3 style="margin: 0 0 10px 0; color: #92400E;">📢 Status Update</h3>
      <p style="margin: 5px 0; color: #92400E;"><strong>Previous Status:</strong> Enrolled</p>
      <p style="margin: 5px 0; color: #92400E;"><strong>Current Status:</strong> {{userStatus}}</p>
      <p style="margin: 5px 0; color: #92400E;"><strong>Effective Date:</strong> {{changeDate}}</p>
      <p style="margin: 5px 0; color: #92400E;"><strong>Changed By:</strong> {{changedBy}}</p>
    </div>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      <strong>What this means:</strong>
    </p>
    <ul style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      <li>Your access to {{cohortName}} materials may be affected</li>
      <li>Your progress has been preserved in our system</li>
      <li>You may be eligible for re-enrollment in future cohorts</li>
    </ul>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      If you have any questions about this change or would like to discuss your options, 
      please don't hesitate to reach out to our support team.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">📊 View Dashboard</a>
    </div>
    
    <p style="color: {{textColor}}; font-size: 14px; text-align: center; margin-top: 30px;">
      Thank you for your understanding. We appreciate your participation in the BVisionRY Lighthouse program.
    </p>
  </div>
</div>`,
    textContent: 'Hello {{userName}}, We are writing to inform you that your enrollment in {{cohortName}} has been updated. Previous Status: Enrolled, Current Status: {{userStatus}}, Effective Date: {{changeDate}}, Changed By: {{changedBy}}. Your progress has been preserved. If you have questions, please contact support. View Dashboard: {{dashboardUrl}}'
  },
  {
    emailType: 'USER_SUSPENDED',
    name: 'User Suspended',
    description: 'Sent when a user is suspended from their cohort',
    subject: 'Important: Your {{cohortName}} Access Has Been Temporarily Suspended',
    htmlContent: `<div style="background-color: {{backgroundColor}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: {{primaryColor}}; margin: 0;">⚠️ Account Status Update</h1>
      <h2 style="color: {{secondaryColor}}; margin: 10px 0;">{{cohortName}}</h2>
    </div>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">Hello {{userName}},</p>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      We are writing to inform you that your access to <strong>{{cohortName}}</strong> 
      has been temporarily suspended by our administrative team.
    </p>
    
    <div style="background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 20px; margin: 25px 0;">
      <h3 style="margin: 0 0 10px 0; color: #B91C1C;">🚫 Suspension Notice</h3>
      <p style="margin: 5px 0; color: #B91C1C;"><strong>Status:</strong> Suspended</p>
      <p style="margin: 5px 0; color: #B91C1C;"><strong>Effective Date:</strong> {{changeDate}}</p>
      <p style="margin: 5px 0; color: #B91C1C;"><strong>Action Taken By:</strong> {{changedBy}}</p>
    </div>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      <strong>What this means:</strong>
    </p>
    <ul style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      <li>Your access to cohort materials is temporarily restricted</li>
      <li>You cannot submit new answers or participate in activities</li>
      <li>Your previous progress and submissions remain preserved</li>
      <li>This suspension may be lifted upon resolution of any outstanding issues</li>
    </ul>
    
    <div style="background-color: #DBEAFE; border: 1px solid {{primaryColor}}; padding: 20px; border-radius: 6px; margin: 25px 0;">
      <h3 style="margin: 0 0 10px 0; color: {{primaryColor}};">📞 Next Steps</h3>
      <p style="margin: 5px 0; color: {{textColor}};">
        If you believe this suspension was made in error or if you would like to discuss 
        the circumstances leading to this action, please contact our administrative team immediately.
      </p>
    </div>
    
    <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6;">
      We value your participation in the BVisionRY Lighthouse program and hope to resolve 
      this matter promptly.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">📊 View Status</a>
    </div>
    
    <p style="color: {{textColor}}; font-size: 14px; text-align: center; margin-top: 30px;">
      For immediate assistance, please contact support or your program administrator.
    </p>
  </div>
</div>`,
    textContent: 'Hello {{userName}}, Your access to {{cohortName}} has been temporarily suspended. Status: Suspended, Effective Date: {{changeDate}}, Action Taken By: {{changedBy}}. Your access to cohort materials is temporarily restricted, but your progress remains preserved. Please contact our administrative team for assistance. View Status: {{dashboardUrl}}'
  }
];

async function seedUserStatusEmailTemplates() {
  console.log('🌱 Seeding user status email templates...');
  
  try {
    // Add to Global Email Templates
    for (const template of userStatusEmailTemplates) {
      const globalTemplate = await prisma.globalEmailTemplate.upsert({
        where: { emailType: template.emailType as any },
        update: {
          name: template.name,
          description: template.description,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
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
      console.log(`✅ Global template: ${template.name}`);
    }

    // Add to all existing cohorts
    const cohorts = await prisma.cohort.findMany({
      select: { id: true, name: true }
    });

    for (const cohort of cohorts) {
      console.log(`📋 Adding templates to cohort: ${cohort.name}`);
      
      for (const template of userStatusEmailTemplates) {
        await prisma.cohortEmailConfig.upsert({
          where: {
            cohortId_emailType: {
              cohortId: cohort.id,
              emailType: template.emailType as any
            }
          },
          update: {
            name: template.name,
            description: template.description,
            subject: template.subject,
            htmlContent: template.htmlContent,
            textContent: template.textContent,
          },
          create: {
            cohortId: cohort.id,
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
      }
      console.log(`✅ Added ${userStatusEmailTemplates.length} templates to ${cohort.name}`);
    }
    
    console.log('🎉 User status email templates seeding completed!');
    console.log(`📧 Added ${userStatusEmailTemplates.length} new email template types`);
    console.log(`📋 Updated ${cohorts.length} existing cohorts`);
    
  } catch (error) {
    console.error('❌ Error seeding user status email templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedUserStatusEmailTemplates().catch(console.error);
}

export { seedUserStatusEmailTemplates };
