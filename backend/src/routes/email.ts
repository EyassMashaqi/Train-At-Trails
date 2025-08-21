import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import emailService from '../services/emailService';

const router = express.Router();
const prisma = new PrismaClient();

// Send test email (admin only)
router.post('/test', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, message' 
      });
    }

    const success = await emailService.sendEmail(
      to,
      subject,
      `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email from Train at Trails</h2>
          <p>${message}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This is a test email sent from the Train at Trails platform.
          </p>
        </div>
      `
    );

    if (success) {
      res.json({ message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send test email' });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Send welcome email to user (admin only)
router.post('/welcome/:userId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.user!.id;
    const { userId } = req.params;
    
    // Check if current user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId }
    });

    if (!currentUser?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const success = await emailService.sendWelcomeEmail(
      targetUser.email,
      targetUser.fullName
    );

    if (success) {
      res.json({ 
        message: `Welcome email sent to ${targetUser.email}` 
      });
    } else {
      res.status(500).json({ error: 'Failed to send welcome email' });
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ error: 'Failed to send welcome email' });
  }
});

// Send bulk notification email (admin only)
router.post('/notification/bulk', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { subject, message, cohortId } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: subject, message' 
      });
    }

    // Get users to send to (all users or specific cohort)
    let users;
    if (cohortId) {
      users = await prisma.user.findMany({
        where: {
          cohortMembers: {
            some: {
              cohortId: cohortId
            }
          }
        }
      });
    } else {
      users = await prisma.user.findMany({
        where: {
          isAdmin: false // Don't send to admin users
        }
      });
    }

    if (users.length === 0) {
      return res.status(404).json({ error: 'No users found to send email to' });
    }

    // Send emails to all users
    const emailPromises = users.map(user => 
      emailService.sendEmail(
        user.email,
        subject,
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">Train at Trails Notification</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; margin-bottom: 15px;">Hello ${user.fullName},</h2>
              <div style="color: #475569; line-height: 1.6;">
                ${message.replace(/\n/g, '<br>')}
              </div>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
                 style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Visit Dashboard
              </a>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 14px;">
                The Train at Trails Team
              </p>
            </div>
          </div>
        `
      )
    );

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({ 
      message: `Bulk notification sent`,
      successful,
      failed,
      total: users.length
    });
  } catch (error) {
    console.error('Error sending bulk notification:', error);
    res.status(500).json({ error: 'Failed to send bulk notification' });
  }
});

// Get email configuration status
router.get('/config/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const config = {
      host: process.env.SMTP_HOST || 'Not configured',
      port: process.env.SMTP_PORT || 'Not configured',
      user: process.env.SMTP_USER || 'Not configured',
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'Not configured',
      fromName: process.env.SMTP_FROM_NAME || 'Train at Trails',
      isConfigured: !!(
        process.env.SMTP_HOST && 
        process.env.SMTP_PORT && 
        process.env.SMTP_USER && 
        process.env.SMTP_PASS
      )
    };

    res.json(config);
  } catch (error) {
    console.error('Error getting email config:', error);
    res.status(500).json({ error: 'Failed to get email configuration' });
  }
});

export default router;
