import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication and admin requirement to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get all users and their progress
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isAdmin: false },
      select: {
        id: true,
        email: true,
        fullName: true,
        trainName: true,
        currentStep: true,
        createdAt: true,
        updatedAt: true,
        answers: {
          include: {
            question: {
              select: {
                questionNumber: true,
                title: true
              }
            }
          },
          orderBy: { submittedAt: 'desc' }
        }
      },
      orderBy: [
        { currentStep: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get all pending answers for review
router.get('/pending-answers', async (req: AuthRequest, res) => {
  try {
    const pendingAnswers = await prisma.answer.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            trainName: true,
            currentStep: true
          }
        },
        question: {
          select: {
            id: true,
            questionNumber: true,
            title: true,
            content: true
          }
        }
      },
      orderBy: { submittedAt: 'asc' }
    });

    res.json({ pendingAnswers });
  } catch (error) {
    console.error('Get pending answers error:', error);
    res.status(500).json({ error: 'Failed to get pending answers' });
  }
});

// Review an answer (approve or reject)
router.put('/answer/:answerId/review', async (req: AuthRequest, res) => {
  try {
    const { answerId } = req.params;
    const { status, feedback } = req.body;
    const adminId = req.user!.id;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ 
        error: 'Status must be either APPROVED or REJECTED' 
      });
    }

    // Get the answer with user info
    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: {
        user: true,
        question: {
          select: { questionNumber: true }
        }
      }
    });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    if (answer.status !== 'PENDING') {
      return res.status(400).json({ 
        error: 'Answer has already been reviewed' 
      });
    }

    // Update answer status
    const updatedAnswer = await prisma.answer.update({
      where: { id: answerId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        feedback
      }
    });

    // If approved, update user's progress
    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: answer.userId },
        data: {
          currentStep: Math.max(answer.user.currentStep, answer.question.questionNumber)
        }
      });
    }

    res.json({
      message: `Answer ${status.toLowerCase()} successfully`,
      answer: updatedAnswer
    });
  } catch (error) {
    console.error('Review answer error:', error);
    res.status(500).json({ error: 'Failed to review answer' });
  }
});

// Get all questions
router.get('/questions', async (req: AuthRequest, res) => {
  try {
    const questions = await prisma.question.findMany({
      orderBy: { questionNumber: 'asc' },
      include: {
        answers: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.json({ questions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// Create a new question
router.post('/questions', async (req: AuthRequest, res) => {
  try {
    const { questionNumber, title, content } = req.body;

    if (!questionNumber || !title || !content) {
      return res.status(400).json({ 
        error: 'Question number, title, and content are required' 
      });
    }

    if (questionNumber < 1 || questionNumber > 12) {
      return res.status(400).json({ 
        error: 'Question number must be between 1 and 12' 
      });
    }

    // Check if question number already exists
    const existingQuestion = await prisma.question.findUnique({
      where: { questionNumber }
    });

    if (existingQuestion) {
      return res.status(400).json({ 
        error: `Question ${questionNumber} already exists` 
      });
    }

    const question = await prisma.question.create({
      data: {
        questionNumber,
        title,
        content,
        isActive: false // Admin needs to manually activate
      }
    });

    res.status(201).json({
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// Update a question
router.put('/questions/:questionId', async (req: AuthRequest, res) => {
  try {
    const { questionId } = req.params;
    const { title, content, isActive } = req.body;

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(typeof isActive === 'boolean' && { 
          isActive,
          ...(isActive && { releaseDate: new Date() })
        })
      }
    });

    res.json({
      message: 'Question updated successfully',
      question
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Manually activate/release a question
router.post('/questions/:questionId/activate', async (req: AuthRequest, res) => {
  try {
    const { questionId } = req.params;

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        isActive: true,
        releaseDate: new Date()
      }
    });

    res.json({
      message: 'Question activated successfully',
      question
    });
  } catch (error) {
    console.error('Activate question error:', error);
    res.status(500).json({ error: 'Failed to activate question' });
  }
});

// Get game statistics
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const totalUsers = await prisma.user.count({
      where: { isAdmin: false }
    });

    const totalAnswers = await prisma.answer.count();

    const pendingAnswers = await prisma.answer.count({
      where: { status: 'PENDING' }
    });

    // Calculate average progress
    const users = await prisma.user.findMany({
      where: { isAdmin: false },
      select: { currentStep: true }
    });

    interface UserProgress {
        currentStep: number;
    }

    const averageProgress: number = totalUsers > 0 
        ? (users.reduce((sum: number, user: UserProgress) => sum + user.currentStep, 0) / totalUsers / 12) * 100
        : 0;

    res.json({
      totalUsers,
      totalAnswers,
      pendingAnswers,
      averageProgress
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;
