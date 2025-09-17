// Default email templates for new users to start with
export const defaultEmailTemplates = {
  WELCOME: {
    emailType: 'WELCOME',
    name: 'Welcome Email',
    description: 'Sent to new users when they register',
    subject: 'Welcome to Your Journey! 🚂',
    htmlContent: `<div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, {{primaryColor}}, {{secondaryColor}}); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; font-size: 28px; margin: 0; font-weight: 600;">Welcome Aboard! 🚂</h1>
      <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 10px 0 0 0;">Your journey begins now, {{userName}}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: {{textColor}}; font-size: 22px; margin: 0 0 20px 0;">Ready for an Amazing Adventure?</h2>
      
      <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        We're thrilled to have you join our learning community! Your train is ready and waiting at the station.
      </p>
      
      <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        Get ready to discover new skills, overcome challenges, and celebrate victories along the way. Every step of this journey is designed to help you grow and succeed.
      </p>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; transition: all 0.3s ease;">
          🚀 Start Your Journey
        </a>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <p style="color: {{textColor}}; font-size: 14px; margin: 0; text-align: center;">
          💡 <strong>Tip:</strong> Keep an eye on your email for updates and new challenges!
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        Welcome to {{companyName}} • Happy Learning! 🎓
      </p>
    </div>
  </div>
</div>`,
    textContent: 'Welcome aboard, {{userName}}! We\'re thrilled to have you join our learning community. Your train is ready and waiting at the station. Get ready to discover new skills, overcome challenges, and celebrate victories along the way. Start your journey: {{dashboardUrl}}'
  },

  PASSWORD_RESET: {
    emailType: 'PASSWORD_RESET',
    name: 'Password Reset Email',
    description: 'Sent when users request password reset',
    subject: 'Reset Your Password 🔒',
    htmlContent: `<div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
    
    <!-- Header -->
    <div style="background-color: {{primaryColor}}; padding: 40px 30px; text-align: center;">
      <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 600;">🔒 Password Reset</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="color: {{textColor}}; font-size: 18px; margin: 0 0 20px 0;">
        Hello <strong>{{userName}}</strong>,
      </p>
      
      <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        We received a request to reset your password. No worries - it happens to the best of us! 
      </p>
      
      <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        Click the button below to create a new password and get back to your learning journey:
      </p>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{resetUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
          🔑 Reset My Password
        </a>
      </div>
      
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <p style="color: #92400e; font-size: 14px; margin: 0; text-align: center;">
          ⚠️ <strong>Security Note:</strong> If you didn't request this reset, please ignore this email. Your password will remain unchanged.
        </p>
      </div>
      
      <p style="color: #64748b; font-size: 14px; margin: 30px 0 0 0; text-align: center;">
        This link will expire in 24 hours for your security.
      </p>
    </div>
  </div>
</div>`,
    textContent: 'Hello {{userName}}, We received a request to reset your password. Click this link to create a new password: {{resetUrl}}. If you didn\'t request this reset, please ignore this email. This link will expire in 24 hours for your security.'
  },

  ANSWER_SUBMISSION: {
    emailType: 'ANSWER_SUBMISSION',
    name: 'Answer Submission Confirmation',
    description: 'Sent when users submit answers',
    subject: 'Answer Submitted Successfully! 📝',
    htmlContent: `<div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 600;">📝 Answer Submitted!</h1>
      <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 10px 0 0 0;">Great job, {{userName}}!</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Your answer for <strong style="color: {{primaryColor}};">{{questionTitle}}</strong> has been successfully submitted and is now being reviewed by our team.
      </p>
      
      <div style="background-color: #f0f9ff; border-left: 4px solid {{primaryColor}}; padding: 20px; margin: 30px 0;">
        <h3 style="color: {{primaryColor}}; margin: 0 0 10px 0; font-size: 18px;">📋 Your Submission Details</h3>
        <p style="color: {{textColor}}; margin: 0; font-size: 14px;">
          <strong>Question:</strong> {{questionTitle}}<br>
          <strong>Submitted:</strong> {{submissionTime}}<br>
          <strong>Status:</strong> Under Review
        </p>
      </div>
      
      <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6; margin: 20px 0;">
        🔍 Our experts are carefully reviewing your submission. You'll receive feedback and your next steps soon!
      </p>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
          🚂 View Your Progress
        </a>
      </div>
      
      <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <p style="color: #065f46; font-size: 14px; margin: 0; text-align: center;">
          💪 <strong>Keep it up!</strong> Every submission brings you closer to completing your journey.
        </p>
      </div>
    </div>
  </div>
</div>`,
    textContent: 'Great job, {{userName}}! Your answer for {{questionTitle}} has been successfully submitted and is now being reviewed by our team. You\'ll receive feedback and your next steps soon! View your progress: {{dashboardUrl}}'
  },

  ANSWER_GRADED: {
    emailType: 'ANSWER_GRADED',
    name: 'Answer Graded Notification',
    description: 'Sent when answers are graded by admin',
    subject: 'Your Answer Has Been Reviewed! 🎯',
    htmlContent: `<div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, {{primaryColor}}, {{secondaryColor}}); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 600;">🎯 Answer Reviewed!</h1>
      <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 10px 0 0 0;">{{userName}}, you've got feedback!</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        Exciting news! Your answer for <strong style="color: {{primaryColor}};">{{questionTitle}}</strong> has been reviewed, and you're ready for the next step in your journey.
      </p>
      
      <!-- Grade Badge -->
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background-color: {{primaryColor}}; color: white; padding: 20px 30px; border-radius: 50px; font-size: 18px; font-weight: 600;">
          📊 Grade: {{grade}}
        </div>
      </div>
      
      <!-- Feedback Section -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin: 30px 0;">
        <h3 style="color: {{primaryColor}}; margin: 0 0 15px 0; font-size: 18px;">💭 Feedback from Your Instructor</h3>
        <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid {{primaryColor}};">
          <p style="color: {{textColor}}; margin: 0; font-size: 16px; line-height: 1.6; font-style: italic;">
            "{{feedback}}"
          </p>
        </div>
      </div>
      
      <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6; margin: 20px 0;">
        🚂 Your train is moving forward! Check your dashboard to see your updated progress and access your next challenge.
      </p>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
          🎯 Continue Your Journey
        </a>
      </div>
    </div>
  </div>
</div>`,
    textContent: 'Great news, {{userName}}! Your answer for {{questionTitle}} has been reviewed. Grade: {{grade}}. Feedback: {{feedback}}. Your train is moving forward! Check your dashboard to continue: {{dashboardUrl}}'
  },

  QUESTION_AVAILABLE: {
    emailType: 'QUESTION_AVAILABLE',
    name: 'New Question Available',
    description: 'Sent when a new question becomes available',
    subject: 'New Challenge Awaits! 🎯 {{questionTitle}}',
    htmlContent: `<div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 600;">🎯 New Challenge!</h1>
      <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 10px 0 0 0;">Ready for your next adventure, {{userName}}?</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        🚂 <strong>All aboard!</strong> A new question is now available and your train is ready to continue its journey.
      </p>
      
      <!-- Question Details -->
      <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1px solid #f59e0b; border-radius: 8px; padding: 25px; margin: 30px 0;">
        <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 20px;">📚 {{questionTitle}}</h3>
        <p style="color: #78350f; margin: 0; font-size: 16px; line-height: 1.6;">
          This challenge will help you grow your skills and move closer to your destination. Take your time, think it through, and give it your best shot!
        </p>
      </div>
      
      <p style="color: {{textColor}}; font-size: 16px; line-height: 1.6; margin: 20px 0;">
        💡 <strong>Remember:</strong> Every question is an opportunity to learn something new. Don't worry about getting it perfect – focus on doing your best and learning from the experience.
      </p>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{questionUrl}}" style="background-color: {{buttonColor}}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
          🚀 Take on the Challenge
        </a>
      </div>
      
      <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <p style="color: #065f46; font-size: 14px; margin: 0; text-align: center;">
          🌟 <strong>You've got this!</strong> We believe in your ability to tackle this challenge.
        </p>
      </div>
    </div>
  </div>
</div>`,
    textContent: 'All aboard, {{userName}}! A new question is now available: {{questionTitle}}. This challenge will help you grow your skills and move closer to your destination. Take on the challenge: {{questionUrl}}'
  }
};

export default defaultEmailTemplates;