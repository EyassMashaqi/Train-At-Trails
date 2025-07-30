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
      
      // Update progress based on question only (since topicId doesn't exist in current schema)
      if (answer.question) {
        newStep = Math.max(answer.user.currentStep, answer.question.questionNumber);
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

// Update question
router.put('/questions/:questionId', async (req: AuthRequest, res) => {
  try {
    const questionId = req.params.questionId;
    const { 
      questionNumber,
      title, 
      content,
      description, 
      deadline, 
      points, 
      bonusPoints,
      isReleased,
      isActive,
      moduleNumber,
      topicNumber
    } = req.body;

    // Find the question by ID
    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Prepare update data
    const updateData: any = {};
    if (questionNumber !== undefined) updateData.questionNumber = parseInt(questionNumber);
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (description !== undefined) updateData.description = description;
    if (deadline !== undefined) updateData.deadline = new Date(deadline);
    if (points !== undefined) updateData.points = parseInt(points);
    if (bonusPoints !== undefined) updateData.bonusPoints = parseInt(bonusPoints);
    if (moduleNumber !== undefined) updateData.moduleNumber = parseInt(moduleNumber);
    if (topicNumber !== undefined) updateData.topicNumber = parseInt(topicNumber);
    if (typeof isReleased === 'boolean') {
      updateData.isReleased = isReleased;
      if (isReleased && !question.isReleased) {
        updateData.releasedAt = new Date();
      }
    }
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: updateData
    });

    res.json({ question: updatedQuestion });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// ========================================
// MODULE AND TOPIC MANAGEMENT ROUTES
// ========================================

// Get all modules with their topics
router.get('/modules', async (req: AuthRequest, res) => {
  try {
    const modules = await (prisma as any).module.findMany({
      include: {
        questions: {
          include: {
            answers: {
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
            }
          },
          orderBy: { topicNumber: 'asc' }
        }
      },
      orderBy: { moduleNumber: 'asc' }
    });

    // Convert to expected format
    const formattedModules = modules.map((module: any) => ({
      id: module.id,
      moduleNumber: module.moduleNumber,
      title: module.title,
      description: module.description,
      isReleased: module.isReleased,
      isActive: module.isActive,
      releaseDate: module.releaseDate,
      releasedAt: module.releasedAt,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
      topics: module.questions.map((question: any) => ({
        id: question.id,
        topicNumber: question.topicNumber || 1,
        title: question.title,
        content: question.content,
        description: question.description,
        isReleased: question.isReleased,
        isActive: question.isActive,
        releaseDate: question.releaseDate,
        releasedAt: question.releasedAt,
        deadline: question.deadline,
        points: question.points,
        bonusPoints: question.bonusPoints,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
        answers: question.answers
      }))
    }));

    res.json({ modules: formattedModules });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ error: 'Failed to get modules' });
  }
});

// Create a new module
router.post('/modules', async (req: AuthRequest, res) => {
  try {
    const { 
      moduleNumber,
      title, 
      description 
    } = req.body;

    // Validate required fields
    if (!moduleNumber || !title || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields: moduleNumber, title, description' 
      });
    }

    // Check if module number already exists
    const existingModule = await (prisma as any).module.findUnique({
      where: { moduleNumber: parseInt(moduleNumber) }
    });

    if (existingModule) {
      return res.status(400).json({ 
        error: `Module ${moduleNumber} already exists` 
      });
    }

    const module = await (prisma as any).module.create({
      data: {
        moduleNumber: parseInt(moduleNumber),
        title,
        description,
        isActive: false,
        isReleased: false
      }
    });

    res.status(201).json({ module });
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// Create a new module (DISABLED - Module model not in current schema)
/*
router.post('/modules', async (req: AuthRequest, res) => {
  try {
    const { 
      moduleNumber,
      title, 
      description, 
      deadline 
    } = req.body;

    // Validate required fields
    if (!moduleNumber || !title || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields: moduleNumber, title, description' 
      });
    }

    // Check if module number already exists
    const existingModule = await prisma.module.findUnique({
      where: { moduleNumber }
    });

    if (existingModule) {
      return res.status(400).json({ 
        error: `Module ${moduleNumber} already exists` 
      });
    }

    const module = await prisma.module.create({
      data: {
        moduleNumber: parseInt(moduleNumber),
        title,
        description,
        deadline: deadline ? new Date(deadline) : null,
        isActive: false,
        isReleased: false
      }
    });

    res.status(201).json({ module });
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({ error: 'Failed to create module' });
  }
});
*/

// Update a module
router.put('/modules/:moduleId', async (req: AuthRequest, res) => {
  try {
    const moduleId = req.params.moduleId;
    const { 
      moduleNumber,
      title, 
      description, 
      isActive,
      isReleased
    } = req.body;

    // Find the module by ID
    const module = await (prisma as any).module.findUnique({
      where: { id: moduleId }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Prepare update data
    const updateData: any = {};
    if (moduleNumber !== undefined) updateData.moduleNumber = parseInt(moduleNumber);
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof isReleased === 'boolean') {
      updateData.isReleased = isReleased;
      if (isReleased && !module.isReleased) {
        updateData.releasedAt = new Date();
      }
    }

    const updatedModule = await (prisma as any).module.update({
      where: { id: moduleId },
      data: updateData
    });

    res.json({ module: updatedModule });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// Delete a module
router.delete('/modules/:moduleId', async (req: AuthRequest, res) => {
  try {
    const moduleId = req.params.moduleId;
    
    const module = await (prisma as any).module.findUnique({
      where: { id: moduleId },
      include: {
        questions: {
          include: {
            answers: true
          }
        }
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Check if module has any questions with answers
    const hasAnswers = module.questions.some((question: any) => question.answers.length > 0);
    if (hasAnswers) {
      return res.status(400).json({ 
        error: 'Cannot delete module with questions that have answers. Please review/remove answers first.' 
      });
    }

    await (prisma as any).module.delete({
      where: { id: moduleId }
    });

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

// Get topics for a specific module
router.get('/modules/:moduleId/topics', async (req: AuthRequest, res) => {
  try {
    const moduleId = req.params.moduleId;
    
    const module = await (prisma as any).module.findUnique({
      where: { id: moduleId },
      include: {
        questions: {
          include: {
            answers: {
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
            }
          },
          orderBy: { topicNumber: 'asc' }
        }
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Convert questions to topics format for compatibility
    const topics = module.questions.map((question: any) => ({
      id: question.id,
      topicNumber: question.topicNumber || 1,
      title: question.title,
      content: question.content,
      description: question.description,
      deadline: question.deadline,
      points: question.points,
      bonusPoints: question.bonusPoints,
      isReleased: question.isReleased,
      isActive: question.isActive,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      module: {
        id: module.id,
        moduleNumber: module.moduleNumber,
        title: module.title
      },
      answers: question.answers
    }));

    res.json({ topics });
  } catch (error) {
    console.error('Get module topics error:', error);
    res.status(500).json({ error: 'Failed to get module topics' });
  }
});

// Get answers for a specific topic (mapped to getting answers by question ID)
router.get('/topics/:topicId/answers', async (req: AuthRequest, res) => {
  try {
    const topicId = req.params.topicId;
    
    const answers = await prisma.answer.findMany({
      where: { questionId: topicId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            trainName: true,
            email: true
          }
        },
        question: {
          select: {
            id: true,
            questionNumber: true,
            title: true,
            topicNumber: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json({ answers });
  } catch (error) {
    console.error('Get topic answers error:', error);
    res.status(500).json({ error: 'Failed to get topic answers' });
  }
});

// Create a new topic within a module
router.post('/modules/:moduleId/topics', async (req: AuthRequest, res) => {
  try {
    const moduleId = req.params.moduleId;
    const { 
      topicNumber, 
      title, 
      content, 
      description, 
      deadline, 
      points, 
      bonusPoints 
    } = req.body;

    // Validate required fields
    if (!topicNumber || !title || !content || !description || !deadline || !points) {
      return res.status(400).json({ 
        error: 'Missing required fields: topicNumber, title, content, description, deadline, points' 
      });
    }

    // Verify module exists
    const module = await (prisma as any).module.findUnique({
      where: { id: moduleId }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Check if topic number already exists in this module
    const existingTopic = await prisma.question.findFirst({
      where: { 
        moduleId,
        topicNumber: parseInt(topicNumber)
      } as any
    });

    if (existingTopic) {
      return res.status(400).json({ 
        error: `Topic ${topicNumber} already exists in this module` 
      });
    }

    // Use a transaction to safely get the next unique questionNumber
    const question = await prisma.$transaction(async (tx) => {
      // Get the highest questionNumber to generate a unique one
      const lastQuestion = await tx.question.findFirst({
        orderBy: { questionNumber: 'desc' }
      });
      const nextQuestionNumber = lastQuestion ? lastQuestion.questionNumber + 1 : 1;

      return await tx.question.create({
        data: {
          questionNumber: nextQuestionNumber, // Use auto-generated unique questionNumber
          title,
          content,
          description,
          deadline: new Date(deadline),
          points: parseInt(points),
          bonusPoints: parseInt(bonusPoints) || 0,
          isReleased: false,
          isActive: false,
          moduleId,
          topicNumber: parseInt(topicNumber)
        } as any
      });
    });

    // Return in topic format for compatibility
    const topic = {
      id: question.id,
      topicNumber: question.topicNumber || 1,
      title: question.title,
      content: question.content,
      description: question.description,
      deadline: question.deadline,
      points: question.points,
      bonusPoints: question.bonusPoints,
      isReleased: question.isReleased,
      isActive: question.isActive,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      module: {
        id: module.id,
        moduleNumber: module.moduleNumber,
        title: module.title
      }
    };

    res.status(201).json({ topic });
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

// Update a topic (mapped to updating a question)
router.put('/topics/:topicId', async (req: AuthRequest, res) => {
  try {
    const topicId = req.params.topicId;
    const { 
      topicNumber,
      title, 
      content, 
      description, 
      deadline, 
      points, 
      bonusPoints,
      isReleased
    } = req.body;

    // Find the question (topic) by ID
    const question = await prisma.question.findUnique({
      where: { id: topicId }
    });

    if (!question) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Prepare update data
    const updateData: any = {};
    if (topicNumber) updateData.topicNumber = parseInt(topicNumber);
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (description) updateData.description = description;
    if (deadline) updateData.deadline = new Date(deadline);
    if (points) updateData.points = parseInt(points);
    if (typeof bonusPoints !== 'undefined') updateData.bonusPoints = parseInt(bonusPoints);
    if (typeof isReleased === 'boolean') {
      updateData.isReleased = isReleased;
      if (isReleased && !question.isReleased) {
        updateData.releasedAt = new Date();
      }
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: topicId },
      data: updateData,
      include: {
        module: true
      } as any
    });

    // Return in topic format for compatibility
    const updatedTopic = {
      id: updatedQuestion.id,
      topicNumber: updatedQuestion.topicNumber || 1,
      title: updatedQuestion.title,
      content: updatedQuestion.content,
      description: updatedQuestion.description,
      deadline: updatedQuestion.deadline,
      points: updatedQuestion.points,
      bonusPoints: updatedQuestion.bonusPoints,
      isReleased: updatedQuestion.isReleased,
      releasedAt: updatedQuestion.releasedAt,
      isActive: updatedQuestion.isActive,
      createdAt: updatedQuestion.createdAt,
      updatedAt: updatedQuestion.updatedAt,
      module: (updatedQuestion as any).module ? {
        id: (updatedQuestion as any).module.id,
        moduleNumber: (updatedQuestion as any).module.moduleNumber,
        title: (updatedQuestion as any).module.title
      } : null
    };

    res.json({ topic: updatedTopic });
  } catch (error) {
    console.error('Update topic error:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// Release a topic (mapped to releasing a question)
router.post('/topics/:topicId/release', async (req: AuthRequest, res) => {
  try {
    const topicId = req.params.topicId;
    
    const question = await prisma.question.findUnique({
      where: { id: topicId },
      include: { module: true }
    });

    if (!question) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: topicId },
      data: { 
        isReleased: true,
        releasedAt: new Date()
      },
      include: { module: true }
    });

    // Return in topic format for compatibility
    const topic = {
      id: updatedQuestion.id,
      topicNumber: updatedQuestion.topicNumber || updatedQuestion.questionNumber,
      title: updatedQuestion.title,
      content: updatedQuestion.content,
      description: updatedQuestion.description,
      deadline: updatedQuestion.deadline,
      points: updatedQuestion.points,
      bonusPoints: updatedQuestion.bonusPoints,
      isReleased: updatedQuestion.isReleased,
      releasedAt: updatedQuestion.releasedAt,
      isActive: updatedQuestion.isActive,
      createdAt: updatedQuestion.createdAt,
      updatedAt: updatedQuestion.updatedAt,
      module: updatedQuestion.module
        ? {
            id: `module-${updatedQuestion.module.moduleNumber || 1}`,
            moduleNumber: updatedQuestion.module.moduleNumber || 1,
            title: updatedQuestion.module.title || `Adventure ${updatedQuestion.module.moduleNumber || 1}`
          }
        : {
            id: `module-1`,
            moduleNumber: 1,
            title: `Adventure 1`
          }
    };

    res.json({ topic });
  } catch (error) {
    console.error('Release topic error:', error);
    res.status(500).json({ error: 'Failed to release topic' });
  }
});

// Delete a topic (mapped to deleting a question)
router.delete('/topics/:topicId', async (req: AuthRequest, res) => {
  try {
    const topicId = req.params.topicId;
    
    const question = await prisma.question.findUnique({
      where: { id: topicId }
    });

    if (!question) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if topic has any answers
    const answerCount = await prisma.answer.count({
      where: { questionId: topicId }
    });

    if (answerCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete topic with existing answers. Please review/remove answers first.' 
      });
    }

    await prisma.question.delete({
      where: { id: topicId }
    });

    res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

export default router;
