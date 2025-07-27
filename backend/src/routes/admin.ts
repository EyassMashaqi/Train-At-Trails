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

// Get game statistics
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    // Get total users (excluding admins)
    const totalUsers = await prisma.user.count({
      where: { isAdmin: false }
    });

    // Get total answers
    const totalAnswers = await prisma.answer.count();

    // Get pending answers
    const pendingAnswers = await prisma.answer.count({
      where: { status: 'PENDING' }
    });

    // Calculate average progress
    const users = await prisma.user.findMany({
      where: { isAdmin: false },
      select: { currentStep: true }
    });

    const averageProgress = users.length > 0 
      ? (users.reduce((sum, user) => sum + user.currentStep, 0) / users.length / 12) * 100
      : 0;

    const stats = {
      totalUsers,
      totalAnswers,
      pendingAnswers,
      averageProgress: Math.round(averageProgress * 10) / 10 // Round to 1 decimal place
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
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

    // Require feedback for both approve and reject
    if (!feedback || feedback.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Feedback is required when reviewing an answer' 
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
      let newStep = answer.user.currentStep;
      
      // Update progress based on question or topic
      if (answer.question) {
        newStep = Math.max(answer.user.currentStep, answer.question.questionNumber);
      } else if (answer.topicId) {
        // For topics, we could implement a different progress calculation
        newStep = answer.user.currentStep + 1;
      }
      
      await prisma.user.update({
        where: { id: answer.userId },
        data: {
          currentStep: newStep
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
      include: {
        _count: {
          select: {
            answers: true
          }
        }
      },
      orderBy: { questionNumber: 'asc' }
    });

    res.json({ questions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// Question Management Routes

// Get specific question with all answers
router.get('/questions/:questionId/answers', async (req: AuthRequest, res) => {
  try {
    const questionId = req.params.questionId;
    
    const answers = await prisma.answer.findMany({
      where: { questionId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            trainName: true,
            email: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json({ answers });
  } catch (error) {
    console.error('Get question answers error:', error);
    res.status(500).json({ error: 'Failed to get question answers' });
  }
});

// Create new question
router.post('/questions', async (req: AuthRequest, res) => {
  try {
    const { questionNumber, title, description, deadline, points, bonusPoints } = req.body;

    // Check if question number already exists
    const existingQuestion = await prisma.question.findUnique({
      where: { questionNumber }
    });

    if (existingQuestion) {
      return res.status(400).json({ error: 'Question number already exists' });
    }

    const question = await prisma.question.create({
      data: {
        questionNumber,
        title,
        content: description, // Use description as content for backward compatibility
        description,
        deadline: new Date(deadline),
        points: points || 100,
        bonusPoints: bonusPoints || 50,
        isActive: false,
        isReleased: false
      }
    });

    res.status(201).json({ question });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// Release question (make it available to users)
router.post('/questions/:questionId/release', async (req: AuthRequest, res) => {
  try {
    const questionId = req.params.questionId;
    
    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        isReleased: true,
        isActive: true, // Also set as active for backward compatibility
        releaseDate: new Date()
      }
    });

    res.json({ question });
  } catch (error) {
    console.error('Release question error:', error);
    res.status(500).json({ error: 'Failed to release question' });
  }
});

// Delete question
router.delete('/questions/:questionId', async (req: AuthRequest, res) => {
  try {
    const questionId = req.params.questionId;
    
    // Check if question has any answers
    const answerCount = await prisma.answer.count({
      where: { questionId }
    });

    if (answerCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete question with existing answers. Please review/remove answers first.' 
      });
    }

    await prisma.question.delete({
      where: { id: questionId }
    });

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

export default router;
