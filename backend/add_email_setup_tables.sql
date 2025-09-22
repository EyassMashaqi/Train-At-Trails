-- Email Setup Database Schema Migration
-- This migration adds support for customizable email templates

-- Email template types enum
CREATE TYPE "EmailType" AS ENUM (
  'WELCOME',
  'PASSWORD_RESET',
  'ANSWER_SUBMISSION',
  'ANSWER_FEEDBACK',
  'NEW_QUESTION',
  'MINI_QUESTION_RELEASE',
  'MINI_ANSWER_RESUBMISSION',
  'RESUBMISSION_APPROVAL'
);

-- Global email templates (used as templates when creating new cohorts)
CREATE TABLE "global_email_templates" (
  "id" TEXT NOT NULL,
  "email_type" "EmailType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "subject" TEXT NOT NULL,
  "html_content" TEXT NOT NULL,
  "text_content" TEXT,
  "primary_color" TEXT NOT NULL DEFAULT '#3B82F6',
  "secondary_color" TEXT NOT NULL DEFAULT '#1E40AF',
  "background_color" TEXT NOT NULL DEFAULT '#F8FAFC',
  "text_color" TEXT NOT NULL DEFAULT '#1F2937',
  "button_color" TEXT NOT NULL DEFAULT '#3B82F6',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "global_email_templates_pkey" PRIMARY KEY ("id")
);

-- Cohort-specific email configurations (copied from global templates)
CREATE TABLE "cohort_email_configs" (
  "id" TEXT NOT NULL,
  "cohort_id" TEXT NOT NULL,
  "email_type" "EmailType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "subject" TEXT NOT NULL,
  "html_content" TEXT NOT NULL,
  "text_content" TEXT,
  "primary_color" TEXT NOT NULL DEFAULT '#3B82F6',
  "secondary_color" TEXT NOT NULL DEFAULT '#1E40AF',
  "background_color" TEXT NOT NULL DEFAULT '#F8FAFC',
  "text_color" TEXT NOT NULL DEFAULT '#1F2937',
  "button_color" TEXT NOT NULL DEFAULT '#3B82F6',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cohort_email_configs_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
ALTER TABLE "global_email_templates" ADD CONSTRAINT "global_email_templates_email_type_key" UNIQUE ("email_type");
ALTER TABLE "cohort_email_configs" ADD CONSTRAINT "cohort_email_configs_cohort_id_email_type_key" UNIQUE ("cohort_id", "email_type");

-- Create foreign key relationships
ALTER TABLE "cohort_email_configs" ADD CONSTRAINT "cohort_email_configs_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for better performance
CREATE INDEX "idx_global_email_templates_email_type" ON "global_email_templates"("email_type");
CREATE INDEX "idx_cohort_email_configs_cohort_id" ON "cohort_email_configs"("cohort_id");
CREATE INDEX "idx_cohort_email_configs_email_type" ON "cohort_email_configs"("email_type");

-- Insert default global email templates
INSERT INTO "global_email_templates" ("id", "email_type", "name", "description", "subject", "html_content", "text_content") VALUES
('tpl_welcome_001', 'WELCOME', 'Welcome Email', 'Sent to new users when they register', 'Welcome to BVisionRY Lighthouse! 🚂', 
'<div style="background-color: {{background_color}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primary_color}}; text-align: center;">Welcome {{userName}}! 🚂</h1>
    <p style="color: {{text_color}}; font-size: 16px;">Welcome to BVisionRY Lighthouse training program!</p>
    <p style="color: {{text_color}}; font-size: 16px;">We are excited to have you on board. Get ready for an amazing learning journey!</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{button_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
    </div>
  </div>
</div>',
'Welcome {{userName}}! Welcome to BVisionRY Lighthouse training program!'),

('tpl_password_reset_001', 'PASSWORD_RESET', 'Password Reset Email', 'Sent when users request password reset', 'Reset Your Password - BVisionRY Lighthouse',
'<div style="background-color: {{background_color}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primary_color}}; text-align: center;">Password Reset Request</h1>
    <p style="color: {{text_color}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{text_color}}; font-size: 16px;">We received a request to reset your password. Click the button below to reset it:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{resetUrl}}" style="background-color: {{button_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
    </div>
    <p style="color: {{text_color}}; font-size: 14px;">If you did not request this, please ignore this email.</p>
  </div>
</div>',
'Hello {{userName}}, Reset your password: {{resetUrl}}'),

('tpl_answer_submission_001', 'ANSWER_SUBMISSION', 'Answer Submission Email', 'Sent when users submit answers', 'Answer Submitted - Question {{questionNumber}} 📝',
'<div style="background-color: {{background_color}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primary_color}}; text-align: center;">Answer Submitted! 📝</h1>
    <p style="color: {{text_color}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{text_color}}; font-size: 16px;">Your answer for <strong>{{questionTitle}}</strong> has been successfully submitted.</p>
    <p style="color: {{text_color}}; font-size: 16px;">We will review your submission and provide feedback soon.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{button_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
    </div>
  </div>
</div>',
'Hello {{userName}}, Your answer for {{questionTitle}} has been submitted.'),

('tpl_answer_feedback_001', 'ANSWER_FEEDBACK', 'Answer Feedback Email', 'Sent when answers are graded', 'Feedback for Question {{questionNumber}} - {{grade}}',
'<div style="background-color: {{background_color}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primary_color}}; text-align: center;">Answer Feedback</h1>
    <p style="color: {{text_color}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{text_color}}; font-size: 16px;">Your answer for <strong>{{questionTitle}}</strong> has been reviewed.</p>
    <div style="background-color: {{secondary_color}}; color: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin: 0; text-align: center;">Grade: {{grade}}</h3>
    </div>
    <p style="color: {{text_color}}; font-size: 16px;"><strong>Feedback:</strong></p>
    <p style="color: {{text_color}}; font-size: 16px;">{{feedback}}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{button_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
    </div>
  </div>
</div>',
'Hello {{userName}}, Your answer for {{questionTitle}} has been graded: {{grade}}. Feedback: {{feedback}}'),

('tpl_new_question_001', 'NEW_QUESTION', 'New Question Email', 'Sent when new questions are released', 'New Question Available 🆕',
'<div style="background-color: {{background_color}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primary_color}}; text-align: center;">New Question Available! 🆕</h1>
    <p style="color: {{text_color}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{text_color}}; font-size: 16px;">A new question is now available: <strong>{{questionTitle}}</strong></p>
    <p style="color: {{text_color}}; font-size: 16px;">Get ready to continue your learning journey!</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{button_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Answer Now</a>
    </div>
  </div>
</div>',
'Hello {{userName}}, New question available: {{questionTitle}}'),

('tpl_mini_question_release_001', 'MINI_QUESTION_RELEASE', 'Mini Question Release Email', 'Sent when self-learning activities are released', 'New Self-Learning Activity Available 📚',
'<div style="background-color: {{background_color}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primary_color}}; text-align: center;">New Self-Learning Activity! 📚</h1>
    <p style="color: {{text_color}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{text_color}}; font-size: 16px;">A new self-learning activity is available:</p>
    <div style="background-color: {{secondary_color}}; color: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin: 0;">{{miniQuestionTitle}}</h3>
      <p style="margin: 5px 0 0 0;">Content: {{contentTitle}}</p>
      <p style="margin: 5px 0 0 0;">Question: {{questionTitle}}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{button_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Start Activity</a>
    </div>
  </div>
</div>',
'Hello {{userName}}, New activity: {{miniQuestionTitle}} in {{contentTitle}} for {{questionTitle}}'),

('tpl_mini_answer_resubmission_001', 'MINI_ANSWER_RESUBMISSION', 'Mini Answer Resubmission Email', 'Sent when resubmission is requested', 'Resubmission Requested - {{miniQuestionTitle}} 🔄',
'<div style="background-color: {{background_color}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primary_color}}; text-align: center;">Resubmission Requested 🔄</h1>
    <p style="color: {{text_color}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{text_color}}; font-size: 16px;">Please resubmit your answer for: <strong>{{miniQuestionTitle}}</strong></p>
    <p style="color: {{text_color}}; font-size: 16px;">Content: {{contentTitle}}</p>
    <p style="color: {{text_color}}; font-size: 16px;">Question: {{questionTitle}}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{button_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Resubmit Now</a>
    </div>
  </div>
</div>',
'Hello {{userName}}, Please resubmit: {{miniQuestionTitle}}'),

('tpl_resubmission_approval_001', 'RESUBMISSION_APPROVAL', 'Resubmission Approval Email', 'Sent when resubmissions are approved', 'Resubmission Approved - {{questionTitle}} ✅',
'<div style="background-color: {{background_color}}; padding: 20px; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
    <h1 style="color: {{primary_color}}; text-align: center;">Resubmission Approved! ✅</h1>
    <p style="color: {{text_color}}; font-size: 16px;">Hello {{userName}},</p>
    <p style="color: {{text_color}}; font-size: 16px;">Your resubmission for <strong>{{questionTitle}}</strong> has been approved!</p>
    <p style="color: {{text_color}}; font-size: 16px;">Congratulations on your persistence and improvement!</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" style="background-color: {{button_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
    </div>
  </div>
</div>',
'Hello {{userName}}, Resubmission approved for: {{questionTitle}}');