import express from 'express';
import multer from 'multer';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

// Note: TypeScript may show errors for Prisma client methods like prisma.module and prisma.topic
// This is a temporary issue with TypeScript language server not recognizing updated Prisma types
// The code works correctly at runtime after database migration and Prisma generation

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/attachments/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'));
    }
  }
});

// Get user's game sta    ]);

    // console.log('Leaderboard API: Found', users.length, 'users');
    // console.log('Leaderboard API: Returning:', { users });
// Get user's game status - simplified for questions-only
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
      where: { 
        isReleased: true,
        isActive: true,
        deadline: { gt: new Date() }
      },
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

    // Check if user has answered current question
    let hasAnsweredCurrent = false;
    if (currentQuestion) {
      const currentQuestionAnswers = answers.filter(answer => answer.questionId === currentQuestion.id);
      if (currentQuestionAnswers.length > 0) {
        const latestAnswer = currentQuestionAnswers[0];
        hasAnsweredCurrent = latestAnswer.status === 'APPROVED' || latestAnswer.status === 'PENDING';
      }
    }

    // Only return currentQuestion if there are no questions organized as modules
    // (legacy fallback for systems not using module/topic structure)
    const questionsWithModules = await prisma.question.findMany({
      where: { moduleId: { not: null } } as any
    });

    // If we have questions organized in modules, don't return currentQuestion
    // to avoid duplication with the module/topic system
    const shouldReturnCurrentQuestion = questionsWithModules.length === 0;

    res.json({
      user,
      currentStep: user.currentStep,
      totalSteps: 12, // Keep for compatibility
      isComplete: user.currentStep >= 12,
      currentQuestion: shouldReturnCurrentQuestion ? (currentQuestion ? {
        id: currentQuestion.id,
        questionNumber: currentQuestion.questionNumber,
        title: currentQuestion.title,
        content: currentQuestion.content,
        description: currentQuestion.description,
        deadline: currentQuestion.deadline,
        points: currentQuestion.points,
        bonusPoints: currentQuestion.bonusPoints,
        hasAnswered: hasAnsweredCurrent
      } : null) : null,
      answers: answers.map((answer: any) => ({
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

// Submit answer to current question - supports both questionId and topicId with file uploads
router.post('/answer', authenticateToken, upload.single('attachment'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { content, questionId, topicId } = req.body;
    const attachmentFile = req.file;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Answer content is required' });
    }

    let currentQuestion = null;
    
    if (topicId) {
      // Topic ID provided - map to corresponding question
      // Since topics are virtual mappings to questions, we need to find the question by topicId
      currentQuestion = await prisma.question.findFirst({
        where: { 
          id: topicId, // topicId maps directly to questionId in our current schema
          isReleased: true,
          isActive: true
        }
      });
    } else if (questionId) {
      // Specific question provided
      currentQuestion = await prisma.question.findFirst({
        where: { 
          id: questionId,
          isReleased: true,
          isActive: true
        }
      });
    } else {
      // Auto-detect current active question
      currentQuestion = await prisma.question.findFirst({
        where: { 
          isReleased: true,
          isActive: true,
          deadline: { gt: new Date() }
        },
        orderBy: { questionNumber: 'asc' }
      });
    }

    if (!currentQuestion) {
      return res.status(400).json({ error: 'No active question available' });
    }

    // Check if user already answered with approved or pending status
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

// Get user's progress in simplified question system
router.get('/progress', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get user details with progress
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
      where: { 
        isReleased: true,
        isActive: true,
        deadline: { gt: new Date() }
      },
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

    // Check if user has answered current question
    let hasAnsweredCurrent = false;
    if (currentQuestion) {
      const currentQuestionAnswers = answers.filter(answer => answer.questionId === currentQuestion.id);
      if (currentQuestionAnswers.length > 0) {
        const latestAnswer = currentQuestionAnswers[0];
        hasAnsweredCurrent = latestAnswer.status === 'APPROVED' || latestAnswer.status === 'PENDING';
      }
    }

    // Get total questions count
    const totalQuestions = await prisma.question.count();

    res.json({
      user,
      currentStep: user.currentStep,
      totalSteps: 12,
      totalQuestions,
      isComplete: user.currentStep >= 12,
      currentQuestion: currentQuestion ? {
        id: currentQuestion.id,
        questionNumber: currentQuestion.questionNumber,
        title: currentQuestion.title,
        content: currentQuestion.content,
        description: currentQuestion.description,
        deadline: currentQuestion.deadline,
        points: currentQuestion.points,
        bonusPoints: currentQuestion.bonusPoints,
        hasAnswered: hasAnsweredCurrent
      } : null,
      answers: answers.map((answer: any) => ({
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
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Get modules - compatibility endpoint for frontend
// Organizes questions by moduleNumber for backward compatibility
router.get('/modules', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Get all modules with their questions using the proper Module table
    const modules = await (prisma as any).module.findMany({
      include: {
        questions: {
          orderBy: { topicNumber: 'asc' }
        }
      },
      orderBy: { moduleNumber: 'asc' }
    });

    // Convert to format that frontend expects
    const formattedModules = modules.map((module: any) => ({
      id: module.id,
      moduleNumber: module.moduleNumber,
      title: module.title,
      description: module.description,
      isReleased: module.isReleased,
      isActive: module.isActive,
      releaseDate: module.releaseDate,
      releasedAt: module.releasedAt,
      topics: module.questions.map((question: any) => ({
        id: question.id,
        topicNumber: question.topicNumber || 1,
        title: question.title,
        description: question.description,
        isReleased: question.isReleased,
        isActive: question.isActive,
        releaseDate: question.releaseDate,
        releasedAt: question.releasedAt,
        deadline: question.deadline,
        points: question.points,
        bonusPoints: question.bonusPoints,
        question: {
          id: question.id,
          content: question.content,
          questionNumber: question.questionNumber
        }
      }))
    }));

    res.json({ modules: formattedModules });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ error: 'Failed to get modules' });
  }
});

export default router;
