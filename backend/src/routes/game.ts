import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get user's game sta    ]);

    // console.log('Leaderboard API: Found', users.length, 'users');
    // console.log('Leaderboard API: Returning:', { users });
router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        trainName: true,
        currentStep: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get current active question
    const currentQuestion = await prisma.question.findFirst({
      where: { isActive: true },
      orderBy: { questionNumber: 'asc' }
    });

    // Get user's answers
    const answers = await prisma.answer.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            id: true,
            questionNumber: true,
            title: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Check if user has answered current question with approved or pending status
    // If the latest answer is rejected, they should be able to answer again
    let hasAnsweredCurrent = false;
    if (currentQuestion) {
      const currentQuestionAnswers = answers.filter((answer: { questionId: any; }) => answer.questionId === currentQuestion.id);
      if (currentQuestionAnswers.length > 0) {
        // Get the most recent answer for this question
        const latestAnswer = currentQuestionAnswers[0]; // Already sorted by submittedAt desc
        // User can't answer again if their latest answer is approved or pending
        hasAnsweredCurrent = latestAnswer.status === 'APPROVED' || latestAnswer.status === 'PENDING';
      }
    }

    res.json({
      user,
      currentStep: user.currentStep,
      totalSteps: 12,
      isComplete: user.currentStep >= 12,
      currentQuestion: currentQuestion ? {
        id: currentQuestion.id,
        questionNumber: currentQuestion.questionNumber,
        title: currentQuestion.title,
        content: currentQuestion.content,
        hasAnswered: hasAnsweredCurrent
      } : null,
      answers: answers.map((answer: { id: any; content: any; status: any; submittedAt: any; reviewedAt: any; feedback: any; question: any; }) => ({
        id: answer.id,
        content: answer.content,
        status: answer.status,
        submittedAt: answer.submittedAt,
        reviewedAt: answer.reviewedAt,
        feedback: answer.feedback,
        question: answer.question
      }))
    });
  } catch (error) {
    console.error('Get game status error:', error);
    res.status(500).json({ error: 'Failed to get game status' });
  }
});

// Submit answer to current question
router.post('/answer', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Answer content is required' });
    }

    // Get current active question
    const currentQuestion = await prisma.question.findFirst({
      where: { isActive: true },
      orderBy: { questionNumber: 'asc' }
    });

    if (!currentQuestion) {
      return res.status(400).json({ error: 'No active question available' });
    }

    // Check if user already answered this question with approved or pending status
    // Allow resubmission only if the latest answer was rejected
    const existingAnswer = await prisma.answer.findFirst({
      where: {
        userId,
        questionId: currentQuestion.id
      },
      orderBy: { submittedAt: 'desc' }
    });

    if (existingAnswer && (existingAnswer.status === 'APPROVED' || existingAnswer.status === 'PENDING')) {
      return res.status(400).json({ 
        error: existingAnswer.status === 'APPROVED' 
          ? 'You have already successfully answered this question'
          : 'You have already submitted an answer for this question and it is pending review',
        existingAnswer: {
          content: existingAnswer.content,
          status: existingAnswer.status,
          submittedAt: existingAnswer.submittedAt
        }
      });
    }

    // Create new answer
    const answer = await prisma.answer.create({
      data: {
        content: content.trim(),
        userId,
        questionId: currentQuestion.id
      },
      include: {
        question: {
          select: {
            questionNumber: true,
            title: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Answer submitted successfully',
      answer: {
        id: answer.id,
        content: answer.content,
        status: answer.status,
        submittedAt: answer.submittedAt,
        question: answer.question
      }
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Get leaderboard (optional enhancement)
router.get('/leaderboard', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const leaderboard = await prisma.user.findMany({
      where: {
        isAdmin: false,
        currentStep: { gt: 0 }
      },
      select: {
        id: true,
        fullName: true,
        trainName: true,
        currentStep: true,
        createdAt: true
      },
      orderBy: [
        { currentStep: 'desc' },
        { createdAt: 'asc' }
      ],
      take: 20
    });

    res.json({ leaderboard });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get next question release time
router.get('/next-question', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Get game config
    const config = await prisma.gameConfig.findUnique({
      where: { id: 'singleton' }
    });

    if (!config) {
      return res.status(500).json({ error: 'Game configuration not found' });
    }

    // Get the latest released question
    const latestQuestion = await prisma.question.findFirst({
      where: { isActive: true },
      orderBy: { questionNumber: 'desc' }
    });

    let nextReleaseTime: Date | null = null;

    if (latestQuestion && latestQuestion.releaseDate) {
      nextReleaseTime = new Date(
        latestQuestion.releaseDate.getTime() + 
        (config.questionReleaseIntervalHours * 60 * 60 * 1000)
      );
    } else {
      // If no questions released yet, use game start date
      nextReleaseTime = new Date(
        config.gameStartDate.getTime() + 
        (config.questionReleaseIntervalHours * 60 * 60 * 1000)
      );
    }

    res.json({
      nextReleaseTime,
      hoursUntilNext: Math.max(0, 
        (nextReleaseTime.getTime() - Date.now()) / (1000 * 60 * 60)
      )
    });
  } catch (error) {
    console.error('Get next question time error:', error);
    res.status(500).json({ error: 'Failed to get next question time' });
  }
});

// Get leaderboard - all users' progress for train animation
router.get('/leaderboard', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isAdmin: false },
      select: {
        id: true,
        fullName: true,
        trainName: true,
        currentStep: true,
        createdAt: true
      },
      orderBy: [
        { currentStep: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    console.log('Leaderboard API: Found', users.length, 'users');
    console.log('Leaderboard API: Returning:', { users });
    res.json({ users });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

export default router;
