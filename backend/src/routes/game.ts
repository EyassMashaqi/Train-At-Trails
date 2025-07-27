import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

// Note: TypeScript may show errors for Prisma client methods like prisma.module and prisma.topic
// This is a temporary issue with TypeScript language server not recognizing updated Prisma types
// The code works correctly at runtime after database migration and Prisma generation

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
        currentModule: true,
        currentTopic: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get current released module and topic
    const currentModule = await prisma.module.findFirst({
      where: { 
        isReleased: true,
        deadline: { gt: new Date() }
      },
      orderBy: { moduleNumber: 'asc' },
      include: {
        topics: {
          where: {
            isReleased: true,
            deadline: { gt: new Date() }
          },
          orderBy: { topicNumber: 'asc' }
        }
      }
    });

    // Get current topic (first unreleased or active topic in current module)
    let currentTopic = null;
    if (currentModule && currentModule.topics.length > 0) {
      currentTopic = currentModule.topics[0];
    }

    // Fallback to old question system if no modules are found
    let currentQuestion = null;
    if (!currentModule) {
      currentQuestion = await prisma.question.findFirst({
        where: { 
          isReleased: true,
          deadline: { gt: new Date() }
        },
        orderBy: { questionNumber: 'asc' }
      });
    }

    // Get user's answers (both old questions and new topics)
    const answers = await prisma.answer.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            id: true,
            questionNumber: true,
            title: true
          }
        },
        topic: {
          select: {
            id: true,
            topicNumber: true,
            title: true,
            module: {
              select: {
                id: true,
                moduleNumber: true,
                title: true
              }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    // Check if user has answered current question/topic
    let hasAnsweredCurrent = false;
    if (currentTopic) {
      const currentTopicAnswers = answers.filter((answer: { topicId: any; }) => answer.topicId === currentTopic.id);
      if (currentTopicAnswers.length > 0) {
        const latestAnswer = currentTopicAnswers[0];
        hasAnsweredCurrent = latestAnswer.status === 'APPROVED' || latestAnswer.status === 'PENDING';
      }
    } else if (currentQuestion) {
      const currentQuestionAnswers = answers.filter((answer: { questionId: any; }) => answer.questionId === currentQuestion.id);
      if (currentQuestionAnswers.length > 0) {
        const latestAnswer = currentQuestionAnswers[0];
        hasAnsweredCurrent = latestAnswer.status === 'APPROVED' || latestAnswer.status === 'PENDING';
      }
    }

    // Calculate total progress (17 total topics across 4 modules)
    const totalTopics = 17;
    const userProgress = Math.max(user.currentStep, 
      (user.currentModule - 1) * 4 + user.currentTopic); // Rough calculation

    res.json({
      user,
      currentStep: user.currentStep,
      currentModule: user.currentModule,
      currentTopic: user.currentTopic,
      totalSteps: 12, // Keep for compatibility
      totalTopics,
      isComplete: userProgress >= totalTopics,
      currentModuleData: currentModule ? {
        id: currentModule.id,
        moduleNumber: currentModule.moduleNumber,
        title: currentModule.title,
        description: currentModule.description,
        deadline: currentModule.deadline,
        totalTopics: currentModule.topics.length
      } : null,
      currentTopicData: currentTopic ? {
        id: currentTopic.id,
        topicNumber: currentTopic.topicNumber,
        title: currentTopic.title,
        content: currentTopic.content,
        description: currentTopic.description,
        deadline: currentTopic.deadline,
        points: currentTopic.points,
        bonusPoints: currentTopic.bonusPoints,
        hasAnswered: hasAnsweredCurrent
      } : null,
      // Fallback to old question system
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
        question: answer.question,
        topic: answer.topic
      }))
    });
  } catch (error) {
    console.error('Get game status error:', error);
    res.status(500).json({ error: 'Failed to get game status' });
  }
});

// Submit answer to current question/topic
router.post('/answer', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { content, topicId, questionId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Answer content is required' });
    }

    let currentTarget = null;
    let targetType = '';

    // Determine if we're answering a topic or question
    if (topicId) {
      // New topic-based system
      currentTarget = await prisma.topic.findFirst({
        where: { 
          id: topicId,
          isReleased: true
        },
        include: {
          module: {
            select: {
              moduleNumber: true,
              title: true
            }
          }
        }
      });
      targetType = 'topic';
    } else if (questionId) {
      // Legacy question system
      currentTarget = await prisma.question.findFirst({
        where: { 
          id: questionId,
          isReleased: true
        }
      });
      targetType = 'question';
    } else {
      // Auto-detect current active target
      currentTarget = await prisma.topic.findFirst({
        where: { 
          isReleased: true,
          deadline: { gt: new Date() }
        },
        orderBy: [
          { module: { moduleNumber: 'asc' } },
          { topicNumber: 'asc' }
        ],
        include: {
          module: {
            select: {
              moduleNumber: true,
              title: true
            }
          }
        }
      });
      
      if (currentTarget) {
        targetType = 'topic';
      } else {
        // Fallback to question system
        currentTarget = await prisma.question.findFirst({
          where: { 
            isReleased: true,
            deadline: { gt: new Date() }
          },
          orderBy: { questionNumber: 'asc' }
        });
        targetType = 'question';
      }
    }

    if (!currentTarget) {
      return res.status(400).json({ error: 'No active question or topic available' });
    }

    // Check if user already answered with approved or pending status
    const whereClause = targetType === 'topic' 
      ? { userId, topicId: currentTarget.id }
      : { userId, questionId: currentTarget.id };

    const existingAnswer = await prisma.answer.findFirst({
      where: whereClause,
      orderBy: { submittedAt: 'desc' }
    });

    if (existingAnswer && (existingAnswer.status === 'APPROVED' || existingAnswer.status === 'PENDING')) {
      return res.status(400).json({ 
        error: existingAnswer.status === 'APPROVED' 
          ? `You have already successfully answered this ${targetType}`
          : `You have already submitted an answer for this ${targetType} and it is pending review`,
        existingAnswer: {
          content: existingAnswer.content,
          status: existingAnswer.status,
          submittedAt: existingAnswer.submittedAt
        }
      });
    }

    // Create new answer
    const answerData = {
      content: content.trim(),
      userId,
      ...(targetType === 'topic' ? { topicId: currentTarget.id } : { questionId: currentTarget.id })
    };

    const includeClause = targetType === 'topic' 
      ? {
          topic: {
            select: {
              topicNumber: true,
              title: true,
              module: {
                select: {
                  moduleNumber: true,
                  title: true
                }
              }
            }
          }
        }
      : {
          question: {
            select: {
              questionNumber: true,
              title: true
            }
          }
        };

    const answer = await prisma.answer.create({
      data: answerData,
      include: includeClause
    });

    res.status(201).json({
      message: `Answer submitted successfully for ${targetType}`,
      answer: {
        id: answer.id,
        content: answer.content,
        status: answer.status,
        submittedAt: answer.submittedAt,
        ...(targetType === 'topic' ? { topic: answer.topic } : { question: answer.question })
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

// Get all modules with their topics
router.get('/modules', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const modules = await prisma.module.findMany({
      where: { isActive: true },
      include: {
        topics: {
          where: { isActive: true },
          orderBy: { topicNumber: 'asc' }
        }
      },
      orderBy: { moduleNumber: 'asc' }
    });

    res.json({ modules });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ error: 'Failed to get modules' });
  }
});

// Get specific module with topics
router.get('/modules/:moduleNumber', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const moduleNumber = parseInt(req.params.moduleNumber);
    
    const module = await prisma.module.findFirst({
      where: { 
        moduleNumber,
        isActive: true 
      },
      include: {
        topics: {
          where: { isActive: true },
          orderBy: { topicNumber: 'asc' }
        }
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json({ module });
  } catch (error) {
    console.error('Get module error:', error);
    res.status(500).json({ error: 'Failed to get module' });
  }
});

// Get user's progress in new module/topic system
router.get('/progress', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get user's completed topics
    const completedAnswers = await prisma.answer.findMany({
      where: {
        userId,
        status: 'APPROVED',
        topicId: { not: null }
      },
      include: {
        topic: {
          include: {
            module: true
          }
        }
      }
    });

    // Group by modules
    const moduleProgress: Record<number, any> = {};
    completedAnswers.forEach(answer => {
      if (answer.topic && answer.topic.module) {
        const moduleNum = answer.topic.module.moduleNumber;
        if (!moduleProgress[moduleNum]) {
          moduleProgress[moduleNum] = {
            module: answer.topic.module,
            completedTopics: []
          };
        }
        moduleProgress[moduleNum].completedTopics.push(answer.topic);
      }
    });

    // Get all modules for progress calculation
    const totalModules = await prisma.module.count({
      where: { isActive: true }
    });

    const totalTopics = await prisma.topic.count({
      where: { isActive: true }
    });

    res.json({
      moduleProgress,
      completedTopics: completedAnswers.length,
      totalModules,
      totalTopics,
      progressPercentage: totalTopics > 0 ? (completedAnswers.length / totalTopics) * 100 : 0
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

export default router;
