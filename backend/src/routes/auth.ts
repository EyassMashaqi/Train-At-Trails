import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

// Import email service for password reset
import { emailService } from '../services/emailService';

// Ensure JWT secret is available for testing
const JWT_SECRET = process.env.JWT_SECRET || 'train-at-trails-super-secure-test-secret-key-2025';

const router = express.Router();
const prisma = new PrismaClient();

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, trainName } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        error: 'Email, password, and full name are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Please provide a valid email address' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        trainName: trainName || `${fullName}'s Train`
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        trainName: true,
        currentStep: true,
        isAdmin: true,
        createdAt: true
      }
    });

    // Assign user to Default Cohort
    try {
      const defaultCohort = await prisma.cohort.findFirst({
        where: { name: 'Default Cohort', isActive: true }
      });

      if (defaultCohort) {
        await prisma.cohortMember.create({
          data: {
            userId: user.id,
            cohortId: defaultCohort.id,
            currentStep: 0,
            isActive: true
          }
        });
        console.log(`✅ User ${user.email} assigned to Default Cohort`);
      } else {
        console.log('⚠️ Default Cohort not found - user not assigned to any cohort');
      }
    } catch (cohortError) {
      console.error('❌ Failed to assign user to Default Cohort:', cohortError);
      // Don't fail registration if cohort assignment fails
    }

    // Send notification email to admin about new user registration
    try {
      const registrationDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      await emailService.sendNewUserRegistrationNotificationToAdmin(
        user.email,
        user.fullName,
        registrationDate
      );
      console.log(`📧 Admin notification sent for new user registration: ${user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send admin notification email:', emailError);
      // Don't fail registration if email sending fails
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('❌ Login attempt failed: Missing email or password');
      return res.status(400).json({ 
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Validate email format
    const loginEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!loginEmailRegex.test(email)) {
      console.log('❌ Login attempt failed: Invalid email format:', email);
      return res.status(400).json({ 
        error: 'Please enter a valid email address',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }

    console.log('🔍 Login attempt for email:', email);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      console.log('❌ Login failed: User not found for email:', email);
      return res.status(401).json({ 
        error: 'No account found with this email address. Please check your email or register for a new account.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Login failed: Incorrect password for email:', email);
      return res.status(401).json({ 
        error: 'Incorrect password. Please check your password and try again.',
        code: 'INVALID_PASSWORD'
      });
    }

    console.log('✅ Login successful for user:', user.fullName, '(', user.email, ')');

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('❌ Login error (unexpected):', error);
    res.status(500).json({ 
      error: 'An unexpected error occurred during login. Please try again.',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get current user endpoint
// Get user's cohort status
router.get('/cohort-status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Get user's active cohort membership
    const cohortMember = await prisma.cohortMember.findFirst({
      where: {
        userId: req.user!.id,
        isActive: true
      },
      include: {
        cohort: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true
          }
        }
      }
    });

    if (cohortMember) {
      const userStatus = cohortMember.status || 'ENROLLED';
      const cohortIsActive = cohortMember.cohort.isActive;
      
      // Special handling for deactivated cohorts
      if (!cohortIsActive) {
        // Only ENROLLED users should get the deactivation message and access restrictions
        // Other statuses (GRADUATED, REMOVED, SUSPENDED) see the cohort normally but can't access dashboard/game anyway
        if (userStatus === 'ENROLLED') {
          res.json({
            isEnrolled: true,
            cohort: cohortMember.cohort,
            currentStep: cohortMember.currentStep,
            status: userStatus,
            canAccessDashboard: false,
            canAccessGame: false,
            message: 'Your cohort has been deactivated. You cannot access the dashboard or game at this time.'
          });
        } else {
          // For other statuses, show the cohort normally but they can't access dashboard/game anyway
          res.json({
            isEnrolled: true,
            cohort: cohortMember.cohort,
            currentStep: cohortMember.currentStep,
            status: userStatus,
            canAccessDashboard: false,
            canAccessGame: false
            // No deactivation message for non-ENROLLED users
          });
        }
      } else {
        // Active cohort - normal behavior
        res.json({
          isEnrolled: true,
          cohort: cohortMember.cohort,
          currentStep: cohortMember.currentStep,
          status: userStatus,
          canAccessDashboard: true,
          canAccessGame: true
        });
      }
    } else {
      res.json({
        isEnrolled: false,
        cohort: null,
        currentStep: 0,
        status: 'NOT_ENROLLED'
      });
    }
  } catch (error) {
    console.error('Get cohort status error:', error);
    res.status(500).json({ error: 'Failed to get cohort status' });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        trainName: true,
        currentStep: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { fullName, trainName } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(fullName && { fullName }),
        ...(trainName && { trainName })
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        trainName: true,
        currentStep: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Forgot Password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address' 
      });
    }

    console.log('🔑 Password reset request for email:', email);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      console.log('❌ Password reset failed: User not found for email:', email);
      return res.json({ 
        message: 'A password reset link has been sent to your email address.' 
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Get token expiry time from environment (default 1 hour)
    const tokenExpiryMinutes = parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES || '60');
    const resetTokenExpiry = new Date(Date.now() + (tokenExpiryMinutes * 60 * 1000));

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      } as any // Temporary type assertion until TypeScript cache refreshes
    });
    
    console.log('Generated reset token for user:', user.email, 'Token:', resetToken);

    // Send password reset email
    try {
      const resetUrl = `${process.env.EMAIL_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5177'}/reset-password?token=${resetToken}`;
      
      await emailService.sendPasswordResetEmail(user.email, user.fullName, resetToken);
      
      console.log('✅ Password reset email sent successfully to:', user.email);
      console.log('🔗 Reset URL:', resetUrl);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      // Don't expose email sending errors to user
    }

    res.json({
      message: 'A password reset link has been sent to your email address.'
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.' 
    });
  }
});

// Validate Reset Token endpoint
router.post('/validate-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        error: 'Reset token is required',
        valid: false 
      });
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date() // Token must not be expired
        }
      } as any,
      select: {
        id: true,
        email: true,
        resetTokenExpiry: true
      } as any // Type assertion for resetTokenExpiry field
    });

    if (!user) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token. Please request a new password reset.',
        valid: false 
      });
    }

    // Calculate time remaining
    const timeRemaining = (user as any).resetTokenExpiry ? 
      Math.max(0, Math.floor(((user as any).resetTokenExpiry.getTime() - Date.now()) / 1000 / 60)) : 0;

    res.json({
      valid: true,
      message: 'Reset token is valid',
      timeRemainingMinutes: timeRemaining
    });
  } catch (error) {
    console.error('❌ Token validation error:', error);
    res.status(500).json({ 
      error: 'An unexpected error occurred while validating the token',
      valid: false 
    });
  }
});

// Reset Password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate input
    if (!token || !newPassword) {
      return res.status(400).json({ 
        error: 'Reset token and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    console.log('🔑 Password reset attempt with token');

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date() // Token must not be expired
        }
      } as any // Type assertion to bypass TypeScript cache issue
    });

    if (!user) {
      console.log('❌ Password reset failed: Invalid or expired token');
      return res.status(400).json({ 
        error: 'Invalid or expired reset token. Please request a new password reset.' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      } as any // Type assertion to bypass TypeScript cache issue
    });

    console.log('✅ Password reset successful for user:', user.email);

    res.json({
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ 
      error: 'An unexpected error occurred. Please try again.' 
    });
  }
});

export default router;
