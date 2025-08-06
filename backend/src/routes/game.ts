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

    // For now, use default cohort info (we can enhance this later when Prisma types are working)
    const cohortInfo = {
      id: 'default-cohort',
      name: 'Default Cohort',
      description: 'Main training cohort'
    };

    // Get current active question
    const currentQuestion = await prisma.question.findFirst({
      where: { 
        isReleased: true,
        isActive: true,
        deadline: { gt: new Date() }
      },
      include: {
        contents: {
          include: {
            miniQuestions: {
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      } as any,
      orderBy: { questionNumber: 'asc' }
    });

    // Get user's answers
    const answers = await prisma.answer.findMany({
      where: { 
        userId
      },
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
      where: { 
        NOT: {
          moduleId: null
        }
      }
    });

    // If we have questions organized in modules, don't return currentQuestion
    // to avoid duplication with the module/topic system
    // Get total topics count for dynamic total steps - only count RELEASED topics (assignments)
    const totalQuestions = await prisma.question.count({
      where: { 
        isReleased: true,
        moduleId: { not: null }, // Only count questions that are part of modules (topics/assignments)
        topicNumber: { not: null }, // Only count questions that have a topic number
        module: {
          isReleased: true
        }
      }
    });

    // Ensure minimum of 1 to prevent division by zero and show meaningful progress
    const effectiveTotalSteps = Math.max(1, totalQuestions);

    const shouldReturnCurrentQuestion = questionsWithModules.length === 0;

    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        trainName: user.trainName,
        currentStep: user.currentStep, // Use user progress for now
        createdAt: user.createdAt
      },
      cohort: cohortInfo,
      currentStep: user.currentStep, // Use user progress for now
      totalSteps: effectiveTotalSteps, // Dynamic total based on actual assignments in database
      isComplete: user.currentStep >= totalQuestions,
      currentQuestion: shouldReturnCurrentQuestion ? (currentQuestion ? {
        id: currentQuestion.id,
        questionNumber: currentQuestion.questionNumber,
        title: currentQuestion.title,
        content: currentQuestion.content,
        description: currentQuestion.description,
        deadline: currentQuestion.deadline,
        points: currentQuestion.points,
        bonusPoints: currentQuestion.bonusPoints,
        hasAnswered: hasAnsweredCurrent,
        contents: (currentQuestion as any).contents || []
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

// Get user's cohort history (active and graduated cohorts)
router.get('/cohort-history', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get all cohort memberships for the user
    const cohortMemberships = await (prisma as any).cohortMember.findMany({
      where: { userId },
      include: {
        cohort: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
            isActive: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // ENROLLED first, then others
        { statusChangedAt: 'desc' }, // Most recently changed
        { joinedAt: 'desc' } // Then most recently joined
      ]
    });

    // Separate cohorts by status
    const activeCohorts = cohortMemberships.filter((membership: any) => 
      membership.status === 'ENROLLED'
    );
    
    const graduatedCohorts = cohortMemberships.filter((membership: any) => 
      membership.status === 'GRADUATED'
    );

    const removedCohorts = cohortMemberships.filter((membership: any) => 
      membership.status === 'REMOVED'
    );

    const suspendedCohorts = cohortMemberships.filter((membership: any) => 
      membership.status === 'SUSPENDED'
    );

    // All non-active cohorts for history display
    const historyCohorts = cohortMemberships.filter((membership: any) => 
      membership.status !== 'ENROLLED'
    );

    res.json({
      activeCohorts: activeCohorts.map((membership: any) => ({
        id: membership.cohort.id,
        name: membership.cohort.name,
        description: membership.cohort.description,
        startDate: membership.cohort.startDate,
        endDate: membership.cohort.endDate,
        joinedAt: membership.joinedAt,
        currentStep: membership.currentStep,
        status: membership.status,
        statusChangedAt: membership.statusChangedAt,
        statusChangedBy: membership.statusChangedBy,
        isActive: membership.isActive
      })),
      graduatedCohorts: graduatedCohorts.map((membership: any) => ({
        id: membership.cohort.id,
        name: membership.cohort.name,
        description: membership.cohort.description,
        startDate: membership.cohort.startDate,
        endDate: membership.cohort.endDate,
        joinedAt: membership.joinedAt,
        graduatedAt: membership.graduatedAt || membership.statusChangedAt,
        graduatedBy: membership.graduatedBy || membership.statusChangedBy,
        finalStep: membership.currentStep,
        status: membership.status,
        statusChangedAt: membership.statusChangedAt
      })),
      historyCohorts: historyCohorts.map((membership: any) => ({
        id: membership.cohort.id,
        name: membership.cohort.name,
        description: membership.cohort.description,
        startDate: membership.cohort.startDate,
        endDate: membership.cohort.endDate,
        joinedAt: membership.joinedAt,
        status: membership.status,
        statusChangedAt: membership.statusChangedAt,
        statusChangedBy: membership.statusChangedBy,
        finalStep: membership.currentStep,
        // Legacy fields for backward compatibility
        graduatedAt: membership.status === 'GRADUATED' ? (membership.graduatedAt || membership.statusChangedAt) : null,
        graduatedBy: membership.status === 'GRADUATED' ? (membership.graduatedBy || membership.statusChangedBy) : null
      })),
      removedCohorts,
      suspendedCohorts,
      hasActiveCohort: activeCohorts.length > 0,
      hasGraduatedCohorts: graduatedCohorts.length > 0,
      hasHistoryCohorts: historyCohorts.length > 0,
      totalCohorts: cohortMemberships.length
    });
  } catch (error) {
    console.error('Get cohort history error:', error);
    res.status(500).json({ error: 'Failed to get cohort history' });
  }
});

// Submit answer to current question - supports both questionId and topicId with file uploads
router.post('/answer', authenticateToken, upload.single('attachment'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { content, questionId, topicId } = req.body;
    const attachmentFile = req.file;

    console.log('Submit answer request received:');
    console.log('  User ID:', userId);
    console.log('  Content length:', content?.length || 0);
    console.log('  Question ID:', questionId);
    console.log('  Topic ID:', topicId);
    console.log('  Has attachment:', !!attachmentFile);
    console.log('  Request body:', req.body);

    if (!content || content.trim().length === 0) {
      console.log('ERROR: No content provided');
      return res.status(400).json({ error: 'Answer content is required' });
    }

    let currentQuestion = null;
    
    if (topicId) {
      console.log('Looking for question by topicId:', topicId);
      // Topic ID provided - map to corresponding question
      // Since topics are virtual mappings to questions, we need to find the question by topicId
      currentQuestion = await prisma.question.findFirst({
        where: { 
          id: topicId, // topicId maps directly to questionId in our current schema
          isReleased: true
          // Removed isActive: true - a released question should be answerable
        }
      });
      console.log('Question found by topicId:', !!currentQuestion);
    } else if (questionId) {
      console.log('Looking for question by questionId:', questionId);
      // Specific question provided
      currentQuestion = await prisma.question.findFirst({
        where: { 
          id: questionId,
          isReleased: true
          // Removed isActive: true - a released question should be answerable
        }
      });
      console.log('Question found by questionId:', !!currentQuestion);
    } else {
      console.log('Auto-detecting current active question');
      // Auto-detect current active question
      currentQuestion = await prisma.question.findFirst({
        where: { 
          isReleased: true,
          isActive: true,
          deadline: { gt: new Date() }
        },
        orderBy: { questionNumber: 'asc' }
      });
      console.log('Question found by auto-detect:', !!currentQuestion);
    }

    console.log('Final question found:', currentQuestion ? { id: currentQuestion.id, title: currentQuestion.title } : 'None');

    if (!currentQuestion) {
      console.log('ERROR: No active question available');
      return res.status(400).json({ error: 'No active question available' });
    }

    // Check if user has completed all released mini questions for this question
    const contents = await prisma.content.findMany({
      where: { questionId: currentQuestion.id },
      include: {
        miniQuestions: {
          where: { isReleased: true },
          include: {
            miniAnswers: {
              where: { userId }
            }
          }
        }
      }
    });

    const totalReleasedMiniQuestions = contents.reduce((total: number, content: any) => 
      total + content.miniQuestions.length, 0
    );
    
    const completedMiniQuestions = contents.reduce((total: number, content: any) =>
      total + content.miniQuestions.filter((mq: any) => mq.miniAnswers.length > 0).length, 0
    );

    if (totalReleasedMiniQuestions > 0 && completedMiniQuestions < totalReleasedMiniQuestions) {
      return res.status(400).json({ 
        error: `You must complete all mini questions before submitting your main answer. Completed: ${completedMiniQuestions}/${totalReleasedMiniQuestions}`,
        requiresMiniQuestions: true,
        progress: {
          completed: completedMiniQuestions,
          total: totalReleasedMiniQuestions
        }
      });
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

    // Get user's default cohort for now (first active membership)
    const userCohort = await prisma.cohortMember.findFirst({
      where: { 
        userId,
        status: 'ENROLLED'
      },
      include: {
        cohort: true
      }
    });

    console.log('User cohort check:');
    console.log('  User cohort found:', !!userCohort);
    console.log('  Cohort details:', userCohort ? { id: userCohort.cohortId, name: userCohort.cohort.name } : 'None');

    if (!userCohort) {
      console.log('ERROR: User not enrolled in any cohort');
      return res.status(400).json({ error: 'User is not enrolled in any active cohort' });
    }

    // Create new answer
    const answer = await prisma.answer.create({
      data: {
        content: content.trim(),
        userId,
        questionId: currentQuestion.id,
        cohortId: userCohort.cohortId
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
        questionNumber: answer.question?.questionNumber || 'N/A',
        questionTitle: answer.question?.title || 'N/A'
      }
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// Get leaderboard (users with progress > 0)
router.get('/leaderboard', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
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

    res.json({ users });
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

// Get user's progress in simplified question system
router.get('/progress', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get user details with cohort information
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

    // Get user's active cohort separately
    const userCohort = await (prisma as any).cohortMember.findFirst({
      where: { 
        userId,
        isActive: true
      },
      include: {
        cohort: true
      }
    });
    
    if (!userCohort) {
      return res.status(400).json({ error: 'User is not a member of any active cohort' });
    }

    // Update mini question release status based on current time
    await updateMiniQuestionReleaseStatus();

    // Get all released questions with their mini questions for user's cohort
    const releasedQuestions = await prisma.question.findMany({
      where: { 
        // cohortId: userCohort.cohortId,  // Temporarily disabled
        // Remove the isReleased requirement - we want ALL questions that user can see
        // because mini questions can be released independently of main questions
        questionNumber: { lte: user.currentStep + 1 } // Show current and next available questions
      },
      include: {
        contents: {
          include: {
            miniQuestions: {
              where: {
                isReleased: true
              },
              include: {
                miniAnswers: {
                  where: { userId },
                  select: {
                    id: true,
                    linkUrl: true,
                    notes: true,
                    submittedAt: true
                  }
                }
              },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        },
        answers: {
          where: { 
            userId,
            cohortId: userCohort.cohortId
          },
          select: {
            id: true,
            content: true,
            status: true,
            submittedAt: true,
            reviewedAt: true,
            feedback: true
          },
          orderBy: { submittedAt: 'desc' },
          take: 1
        }
      } as any,
      orderBy: { questionNumber: 'asc' }
    });

    // Process questions to determine availability and mini question progress
    const processedQuestions = releasedQuestions.map((question: any) => {
      const contents = question.contents || [];
      const totalMiniQuestions = contents.reduce((total: number, content: any) => 
        total + content.miniQuestions.length, 0
      );
      
      const completedMiniQuestions = contents.reduce((total: number, content: any) =>
        total + content.miniQuestions.filter((mq: any) => mq.miniAnswers.length > 0).length, 0
      );

      const canSolveMainQuestion = totalMiniQuestions === 0 || completedMiniQuestions === totalMiniQuestions;
      const hasMainAnswer = question.answers.length > 0;
      const mainAnswerStatus = hasMainAnswer ? question.answers[0].status : null;

      // Determine question availability - use cohort-specific progress
      let questionStatus = 'locked';
      if (question.questionNumber <= userCohort.currentStep + 1) {
        if (totalMiniQuestions > 0) {
          if (completedMiniQuestions < totalMiniQuestions) {
            questionStatus = 'mini_questions_required';
          } else if (canSolveMainQuestion && !hasMainAnswer) {
            questionStatus = 'available';
          } else if (hasMainAnswer) {
            questionStatus = mainAnswerStatus === 'APPROVED' ? 'completed' : 'submitted';
          }
        } else {
          // No mini questions
          if (!hasMainAnswer) {
            questionStatus = 'available';
          } else {
            questionStatus = mainAnswerStatus === 'APPROVED' ? 'completed' : 'submitted';
          }
        }
      }

      return {
        id: question.id,
        questionNumber: question.questionNumber,
        title: question.title,
        content: question.content,
        description: question.description,
        deadline: question.deadline,
        points: question.points,
        bonusPoints: question.bonusPoints,
        status: questionStatus,
        canSolveMainQuestion,
        hasMainAnswer,
        mainAnswer: hasMainAnswer ? question.answers[0] : null,
        miniQuestionProgress: {
          total: totalMiniQuestions,
          completed: completedMiniQuestions,
          percentage: totalMiniQuestions > 0 ? Math.round((completedMiniQuestions / totalMiniQuestions) * 100) : 0
        },
        contents: contents.map((content: any) => ({
          id: content.id,
          title: content.title,
          material: content.material,
          orderIndex: content.orderIndex,
          miniQuestions: content.miniQuestions.map((mq: any) => ({
            id: mq.id,
            title: mq.title,
            question: mq.question,
            description: mq.description,
            orderIndex: mq.orderIndex,
            isReleased: mq.isReleased,
            releaseDate: mq.releaseDate,
            hasAnswer: mq.miniAnswers.length > 0,
            answer: mq.miniAnswers.length > 0 ? mq.miniAnswers[0] : null
          }))
        }))
      };
    });

    // Get total topics count - only count RELEASED topics (assignments)
    const totalQuestions = await prisma.question.count({
      where: { 
        // cohortId: userCohort.cohortId,  // Temporarily disabled
        isReleased: true,
        moduleId: { not: null }, // Only count questions that are part of modules (topics/assignments)
        topicNumber: { not: null }, // Only count questions that have a topic number
        module: {
          isReleased: true
        }
      }
    });

    // Ensure minimum of 1 to prevent division by zero and show meaningful progress
    const effectiveTotalSteps = Math.max(1, totalQuestions);

    // For backward compatibility with original GameView, also provide currentQuestion
    let currentQuestion = null;
    let currentQuestionMiniQuestions = [];
    
    if (processedQuestions.length > 0) {
      // Find the current active question (first available or mini_questions_required)
      const activeQuestion = processedQuestions.find(q => 
        q.status === 'available' || q.status === 'mini_questions_required'
      ) || processedQuestions[0];
      
      if (activeQuestion) {
        currentQuestion = {
          id: activeQuestion.id,
          questionNumber: activeQuestion.questionNumber,
          title: activeQuestion.title,
          content: activeQuestion.content,
          description: activeQuestion.description,
          deadline: activeQuestion.deadline,
          points: activeQuestion.points,
          bonusPoints: activeQuestion.bonusPoints,
          hasAnswered: activeQuestion.hasMainAnswer,
          contents: activeQuestion.contents
        };
      }
      
      // Collect released mini questions from ALL processed questions (already filtered by released)
      currentQuestionMiniQuestions = processedQuestions
        .flatMap((question: any) => 
          question.contents.flatMap((content: any) => 
            content.miniQuestions
              .filter((mq: any) => mq.isReleased) // Only filter by released, not by hasAnswer
              .map((mq: any) => ({
                ...mq,
                contentId: content.id,
                contentTitle: content.title,
                questionId: question.id,
                questionTitle: question.title,
                questionNumber: question.questionNumber
              }))
          )
        );
    }

    // Get user's answers in the format expected by original GameView
    const allAnswers = await prisma.answer.findMany({
      where: { 
        userId
        // cohortId: userCohort.cohortId  // Temporarily disabled
      },
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

    res.json({
      // New structure for enhanced features
      user: {
        id: user.id,
        fullName: user.fullName,
        trainName: user.trainName,
        currentStep: userCohort.currentStep,
        createdAt: user.createdAt
      },
      cohort: {
        id: userCohort.cohort.id,
        name: userCohort.cohort.name,
        description: userCohort.cohort.description
      },
      currentStep: userCohort.currentStep,
      totalSteps: effectiveTotalSteps, // Dynamic total based on actual assignments in database
      totalQuestions,
      isComplete: userCohort.currentStep >= totalQuestions,
      questions: processedQuestions,
      
      // Backward compatibility for original GameView
      currentQuestion,
      currentQuestionMiniQuestions,
      answers: allAnswers.map((answer: any) => ({
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
    const userId = req.user!.id;

    // Get user's active cohort
    const userCohort = await prisma.cohortMember.findFirst({
      where: { 
        userId,
        status: 'ENROLLED'
      },
      include: {
        cohort: true
      }
    });

    if (!userCohort) {
      return res.status(400).json({ error: 'User is not a member of any active cohort' });
    }

    console.log('Modules endpoint - User cohort:', { 
      userId, 
      cohortId: userCohort.cohortId, 
      cohortName: userCohort.cohort.name 
    });

    // Get all modules with their questions using the proper Module table
    const modules = await prisma.module.findMany({
      where: {
        cohortId: userCohort.cohortId
      },
      include: {
        questions: {
          include: {
            contents: {
              include: {
                miniQuestions: {
                  where: {
                    isReleased: true // Only include released mini-questions
                  },
                  include: {
                    miniAnswers: {
                      where: { userId },
                      select: {
                        id: true,
                        linkUrl: true,
                        notes: true,
                        submittedAt: true
                      }
                    }
                  },
                  orderBy: { orderIndex: 'asc' }
                }
              },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { topicNumber: 'asc' }
        }
      },
      orderBy: { moduleNumber: 'asc' }
    });

    console.log('Modules found:', modules.length);
    console.log('Modules data:', modules.map(m => ({ 
      id: m.id, 
      moduleNumber: m.moduleNumber, 
      title: m.title, 
      cohortId: m.cohortId,
      isReleased: m.isReleased 
    })));

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
        content: question.content, // Add content at the topic level
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
        },
        // Add contents and mini-questions for self-learning activities
        contents: question.contents?.map((content: any) => ({
          id: content.id,
          title: content.title,
          material: content.material,
          orderIndex: content.orderIndex,
          miniQuestions: content.miniQuestions?.map((mq: any) => ({
            id: mq.id,
            title: mq.title,
            question: mq.question,
            description: mq.description,
            orderIndex: mq.orderIndex,
            isReleased: mq.isReleased,
            releaseDate: mq.releaseDate,
            hasAnswer: mq.miniAnswers.length > 0,
            answer: mq.miniAnswers.length > 0 ? mq.miniAnswers[0] : null
          })) || []
        })) || []
      }))
    }));

    console.log('Formatted modules being returned:', formattedModules.map(m => ({ 
      id: m.id, 
      moduleNumber: m.moduleNumber, 
      title: m.title, 
      isReleased: m.isReleased,
      topicsCount: m.topics.length 
    })));

    res.json({ modules: formattedModules });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ error: 'Failed to get modules' });
  }
});

// Submit mini-answer (link submission for self-learning content)
router.post('/mini-answer', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { miniQuestionId, linkUrl, notes } = req.body;

    if (!miniQuestionId || !linkUrl) {
      return res.status(400).json({ 
        error: 'Mini-question ID and link URL are required' 
      });
    }

    // Validate URL format
    try {
      new URL(linkUrl);
    } catch {
      return res.status(400).json({ 
        error: 'Please provide a valid URL' 
      });
    }

    // Temporarily disable cohort validation but get a default cohort
    // Get user's active cohort
    const userCohort = await prisma.cohortMember.findFirst({
      where: { 
        userId,
        status: 'ENROLLED'
      },
      include: {
        cohort: true
      }
    });

    if (!userCohort) {
      return res.status(400).json({ error: 'User is not enrolled in any active cohort' });
    }

    // Verify mini-question exists
    const miniQuestion = await prisma.miniQuestion.findUnique({
      where: { id: miniQuestionId },
      include: {
        content: {
          include: {
            question: true
          }
        }
      }
    });

    if (!miniQuestion) {
      return res.status(404).json({ error: 'Mini-question not found' });
    }

    // Check if user already answered this mini-question
    const existingAnswer = await prisma.miniAnswer.findFirst({
      where: {
        userId,
        miniQuestionId,
        cohortId: userCohort.cohortId
      }
    });

    if (existingAnswer) {
      // Update existing answer
      const updatedAnswer = await prisma.miniAnswer.update({
        where: { id: existingAnswer.id },
        data: {
          linkUrl: linkUrl.trim(),
          notes: notes ? notes.trim() : null,
          submittedAt: new Date()
        }
      });

      res.json({
        message: 'Mini-answer updated successfully',
        miniAnswer: updatedAnswer
      });
    } else {
      // Create new answer
      const miniAnswer = await prisma.miniAnswer.create({
        data: {
          linkUrl: linkUrl.trim(),
          notes: notes ? notes.trim() : null,
          userId,
          miniQuestionId,
          cohortId: userCohort.cohortId
        }
      });

      res.status(201).json({
        message: 'Mini-answer submitted successfully',
        miniAnswer
      });
    }
  } catch (error) {
    console.error('Submit mini-answer error:', error);
    res.status(500).json({ error: 'Failed to submit mini-answer' });
  }
});

// Get user's mini-answers for a question
router.get('/questions/:questionId/mini-answers', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const questionId = req.params.questionId;

    // Get all mini-answers for this question by this user
    const miniAnswers = await prisma.miniAnswer.findMany({
      where: {
        userId,
        miniQuestion: {
          content: {
            questionId
          }
        }
      },
      include: {
        miniQuestion: {
          include: {
            content: true
          }
        }
      }
    });

    res.json({ miniAnswers });
  } catch (error) {
    console.error('Get mini-answers error:', error);
    res.status(500).json({ error: 'Failed to get mini-answers' });
  }
});

// Get user's progress through content sections
router.get('/questions/:questionId/content-progress', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const questionId = req.params.questionId;

    // Get question with all content sections and mini-questions
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        contents: {
          include: {
            miniQuestions: {
              where: {
                isReleased: true // Only show released mini questions
              },
              include: {
                miniAnswers: {
                  where: { userId },
                  select: {
                    id: true,
                    linkUrl: true,
                    submittedAt: true
                  }
                }
              },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      } as any
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Calculate progress (only for released mini questions)
    const contents = (question as any).contents || [];
    const totalMiniQuestions = contents.reduce((total: number, content: any) => 
      total + content.miniQuestions.length, 0
    );
    
    const completedMiniQuestions = contents.reduce((total: number, content: any) =>
      total + content.miniQuestions.filter((mq: any) => mq.miniAnswers.length > 0).length, 0
    );

    // Check if user can solve main question (all released mini questions must be completed)
    const canSolveMainQuestion = completedMiniQuestions === totalMiniQuestions && totalMiniQuestions > 0;

    const progress = {
      totalContentSections: contents.length,
      totalMiniQuestions,
      completedMiniQuestions,
      progressPercentage: totalMiniQuestions > 0 ? 
        Math.round((completedMiniQuestions / totalMiniQuestions) * 100) : 0,
      canSolveMainQuestion,
      contents: contents.map((content: any) => ({
        id: content.id,
        title: content.title,
        orderIndex: content.orderIndex,
        miniQuestions: content.miniQuestions.map((mq: any) => ({
          id: mq.id,
          title: mq.title,
          question: mq.question,
          description: mq.description,
          orderIndex: mq.orderIndex,
          isReleased: mq.isReleased,
          releaseDate: mq.releaseDate,
          hasAnswer: mq.miniAnswers.length > 0,
          submittedAt: mq.miniAnswers.length > 0 ? mq.miniAnswers[0].submittedAt : null
        }))
      }))
    };

    res.json({ progress });
  } catch (error) {
    console.error('Get content progress error:', error);
    res.status(500).json({ error: 'Failed to get content progress' });
  }
});

// Helper function to update mini question release status
async function updateMiniQuestionReleaseStatus() {
  try {
    const now = new Date();
    
    // Find all mini questions that should be released but aren't yet
    const miniQuestionsToRelease = await prisma.miniQuestion.findMany({
      where: {
        isReleased: false,
        releaseDate: {
          lte: now
        }
      }
    });

    // Update their release status
    for (const miniQ of miniQuestionsToRelease) {
      await prisma.miniQuestion.update({
        where: { id: miniQ.id },
        data: {
          isReleased: true,
          actualReleaseDate: now
        }
      });
    }

    if (miniQuestionsToRelease.length > 0) {
      console.log(`Released ${miniQuestionsToRelease.length} mini questions`);
    }
  } catch (error) {
    console.error('Error updating mini question release status:', error);
  }
}

export default router;
