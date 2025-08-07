import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

  // Validation function to check if assignment deadline is before any self learning activity release date
const validateAssignmentDeadline = (deadline: Date, contents: any[]): { isValid: boolean; errorMessage?: string } => {
  if (!deadline || !contents || contents.length === 0) {
    return { isValid: true };
  }

  // Check all self learning activities for release dates that are after the assignment deadline
  for (const content of contents) {
    // Handle both nested structure (from API) and flat structure (from forms)
    const miniQuestions = content.miniQuestions || [content];
    
    for (const miniQuestion of miniQuestions) {
      if (miniQuestion.releaseDate) {
        const releaseDate = new Date(miniQuestion.releaseDate);
        if (releaseDate > deadline) {
          const formattedReleaseDate = releaseDate.toLocaleDateString();
          const formattedDeadline = deadline.toLocaleDateString();
          return {
            isValid: false,
            errorMessage: `Assignment deadline (${formattedDeadline}) cannot be before self learning activity release date (${formattedReleaseDate}). Please adjust the deadline or the activity release dates.`
          };
        }
      }
    }
  }
  
  return { isValid: true };
};

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

// Get game statistics (filtered by admin's cohort access)
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const adminUserId = req.user!.id;
    
    // Get admin's cohort access
    const adminCohorts = await prisma.cohortMember.findMany({
      where: { 
        userId: adminUserId,
        status: 'ENROLLED'
      },
      select: {
        cohortId: true
      }
    });

    if (adminCohorts.length === 0) {
      return res.json({
        totalUsers: 0,
        totalAnswers: 0,
        pendingAnswers: 0,
        averageProgress: 0
      });
    }

    const cohortIds = adminCohorts.map(ac => ac.cohortId);

    // Get total users in admin's accessible cohorts (excluding admins)
    const cohortMembers = await prisma.cohortMember.findMany({
      where: {
        cohortId: { in: cohortIds },
        status: 'ENROLLED',
        user: {
          isAdmin: false
        }
      },
      include: {
        user: {
          select: {
            currentStep: true
          }
        }
      }
    });

    const totalUsers = cohortMembers.length;

    // Get total answers in admin's accessible cohorts
    const totalAnswers = await prisma.answer.count({
      where: {
        cohortId: { in: cohortIds }
      }
    });

    // Get pending answers in admin's accessible cohorts
    const pendingAnswers = await prisma.answer.count({
      where: { 
        status: 'PENDING',
        cohortId: { in: cohortIds }
      }
    });

    // Get total topics count for dynamic average calculation
    const totalTopics = await prisma.question.count({
      where: { 
        isReleased: true,
        cohortId: { in: cohortIds },
        moduleId: { not: null }, // Only count questions that are part of modules (topics/assignments)
        topicNumber: { not: null }, // Only count questions that have a topic number
        module: {
          isReleased: true
        }
      }
    });

    // Ensure minimum of 1 to prevent division by zero
    const effectiveTotalSteps = Math.max(1, totalTopics);

    // Calculate average progress for users in admin's cohorts
    const averageProgress = totalUsers > 0
      ? (cohortMembers.reduce((sum, member) => sum + member.user.currentStep, 0) / totalUsers / effectiveTotalSteps) * 100
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

// Get all pending answers for review (filtered by admin's cohort access)
router.get('/pending-answers', async (req: AuthRequest, res) => {
  try {
    const adminUserId = req.user!.id;
    
    // Get admin's cohort access (admins can access specific cohorts)
    const adminCohorts = await prisma.cohortMember.findMany({
      where: { 
        userId: adminUserId,
        status: 'ENROLLED'
      },
      select: {
        cohortId: true
      }
    });

    // If admin has no cohort access, return empty
    if (adminCohorts.length === 0) {
      return res.json({ pendingAnswers: [] });
    }

    const cohortIds = adminCohorts.map(ac => ac.cohortId);

    const pendingAnswers = await prisma.answer.findMany({
      where: { 
        status: 'PENDING',
        cohortId: { in: cohortIds } // Filter by admin's accessible cohorts
      },
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
        },
        cohort: {
          select: {
            id: true,
            name: true
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
    const { cohortId } = req.query;
    
    // Build filter conditions
    const whereClause: any = {};
    if (cohortId && cohortId !== 'all') {
      whereClause.cohortId = cohortId as string;
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            answers: true
          }
        },
        contents: {
          include: {
            miniQuestions: {
              include: {
                _count: {
                  select: {
                    miniAnswers: true
                  }
                }
              },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      } as any,
      orderBy: { questionNumber: 'asc' }
    });

    res.json({ questions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// Question Management Routes

// Get specific question with all answers (filtered by admin's cohort access)
router.get('/questions/:questionId/answers', async (req: AuthRequest, res) => {
  try {
    const questionId = req.params.questionId;
    const adminUserId = req.user!.id;
    
    // Get admin's cohort access
    const adminCohorts = await prisma.cohortMember.findMany({
      where: { 
        userId: adminUserId,
        status: 'ENROLLED'
      },
      select: {
        cohortId: true
      }
    });

    if (adminCohorts.length === 0) {
      return res.json({ answers: [] });
    }

    const cohortIds = adminCohorts.map(ac => ac.cohortId);
    
    const answers = await prisma.answer.findMany({
      where: { 
        questionId,
        cohortId: { in: cohortIds } // Filter by admin's accessible cohorts
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            trainName: true,
            email: true
          }
        },
        cohort: {
          select: {
            id: true,
            name: true
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
    const { 
      questionNumber, 
      title, 
      description, 
      deadline, 
      points, 
      bonusPoints, 
      contents 
    } = req.body;

    // Get the default cohort
    const defaultCohort = await prisma.cohort.findFirst({
      where: { name: 'Default Cohort', isActive: true }
    });

    if (!defaultCohort) {
      return res.status(500).json({ error: 'Default cohort not found' });
    }

    // Check if question number already exists in this cohort
    const existingQuestion = await prisma.question.findUnique({
      where: { 
        questionNumber_cohortId: {
          questionNumber: questionNumber,
          cohortId: defaultCohort.id
        }
      }
    });

    if (existingQuestion) {
      return res.status(400).json({ error: 'Question number already exists in this cohort' });
    }

    // Create question with content sections
    const question = await prisma.$transaction(async (tx) => {
      // Create the main question
      const newQuestion = await tx.question.create({
        data: {
          questionNumber,
          title,
          content: description, // Use description as content for backward compatibility
          description,
          deadline: new Date(deadline),
          points: points || 100,
          bonusPoints: bonusPoints || 50,
          isActive: false,
          isReleased: false,
          cohortId: defaultCohort.id
        }
      });

      // Create content sections if provided
      if (contents && Array.isArray(contents)) {
        for (let i = 0; i < contents.length; i++) {
          const contentData = contents[i];
          const content = await (tx as any).content.create({
            data: {
              title: contentData.title,
              material: contentData.material,
              orderIndex: i + 1,
              questionId: newQuestion.id
            }
          });

          // Create mini-questions for this content
          if (contentData.miniQuestions && Array.isArray(contentData.miniQuestions)) {
            for (let j = 0; j < contentData.miniQuestions.length; j++) {
              const miniQuestionData = contentData.miniQuestions[j];
              await (tx as any).miniQuestion.create({
                data: {
                  title: miniQuestionData.title,
                  question: miniQuestionData.question,
                  description: miniQuestionData.description || '',
                  orderIndex: j + 1,
                  contentId: content.id
                }
              });
            }
          }
        }
      }

      return newQuestion;
    });

    // Fetch the complete question with content sections for response
    const completeQuestion = await prisma.question.findUnique({
      where: { id: question.id },
      include: {
        contents: {
          include: {
            miniQuestions: {
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      } as any
    });

    res.status(201).json({ question: completeQuestion });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// Release question (make it available to users)
router.post('/questions/:questionId/release', async (req: AuthRequest, res) => {
  try {
    const questionId = req.params.questionId;
    
    // Get the question with its contents and mini questions
    const questionWithContents = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        contents: {
          include: {
            miniQuestions: true
          }
        }
      }
    }) as any;

    if (!questionWithContents) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        isReleased: true,
        isActive: true, // Also set as active for backward compatibility
        releaseDate: new Date()
      }
    });

    // Start releasing mini questions based on their individual release dates
    if (questionWithContents.contents) {
      for (const content of questionWithContents.contents) {
        if (content.miniQuestions) {
          for (const miniQuestion of content.miniQuestions) {
            if (miniQuestion.releaseDate) {
              const releaseDate = new Date(miniQuestion.releaseDate);
              const now = new Date();
              
              // If the release date is now or in the past, release immediately
              if (releaseDate <= now) {
                await (prisma as any).miniQuestion.update({
                  where: { id: miniQuestion.id },
                  data: { 
                    isReleased: true,
                    actualReleaseDate: new Date()
                  }
                });
              }
              // Note: Future releases will be handled by the scheduler
            }
          }
        }
      }
    }

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
      topicNumber,
      contents
    } = req.body;

    // Find the question by ID
    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Validate assignment deadline against self learning activity release dates
    if (deadline && contents) {
      const assignmentDeadline = new Date(deadline);
      const validationResult = validateAssignmentDeadline(assignmentDeadline, contents);
      if (!validationResult.isValid) {
        return res.status(400).json({ 
          error: validationResult.errorMessage 
        });
      }
    }

    // Use transaction to update question and content sections
    const updatedQuestion = await prisma.$transaction(async (tx) => {
      // Prepare update data for question
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

      // Update the question
      const updated = await tx.question.update({
        where: { id: questionId },
        data: updateData
      });

      // Handle content sections if provided
      if (contents && Array.isArray(contents)) {
        console.log('🔄 Updating question content, preserving mini answers...');
        
        // Get existing content sections and mini questions with their answers
        const existingContent = await (tx as any).content.findMany({
          where: { questionId },
          include: {
            miniQuestions: {
              include: {
                miniAnswers: true
              }
            }
          }
        });

        console.log(`📊 Found ${existingContent.length} existing content sections`);
        const totalExistingAnswers = existingContent.reduce((total: number, content: any) => 
          total + content.miniQuestions.reduce((subtotal: number, mq: any) => subtotal + mq.miniAnswers.length, 0), 0
        );
        console.log(`💾 Preserving ${totalExistingAnswers} existing mini answers`);

        // Check if contents is in the flat structure (each item has material, question, releaseDate)
        // or nested structure (each item has title, material, miniQuestions array)
        const isFlat = contents.length > 0 && contents[0].hasOwnProperty('material') && contents[0].hasOwnProperty('question');
        
        if (isFlat) {
          // Handle flat structure - create one content section with multiple mini questions
          let contentSection = existingContent[0];
          
          if (!contentSection) {
            // Create new content section if none exists
            contentSection = await (tx as any).content.create({
              data: {
                title: 'Learning Material',
                material: 'Self-learning content',
                orderIndex: 1,
                questionId
              }
            });
          }

          // Get existing mini questions for this content
          const existingMiniQuestions = await (tx as any).miniQuestion.findMany({
            where: { contentId: contentSection.id },
            include: { miniAnswers: true }
          });

          // Process each mini question from the update request
          for (let i = 0; i < contents.length; i++) {
            const contentData = contents[i];
            const existingMiniQuestion = existingMiniQuestions.find((mq: any) => mq.orderIndex === i + 1);

            if (existingMiniQuestion) {
              // Update existing mini question (preserve answers)
              await (tx as any).miniQuestion.update({
                where: { id: existingMiniQuestion.id },
                data: {
                  title: contentData.material || `Learning Activity ${i + 1}`,
                  question: contentData.question,
                  description: contentData.question,
                  releaseDate: contentData.releaseDate ? new Date(contentData.releaseDate) : null,
                  orderIndex: i + 1
                }
              });
            } else {
              // Create new mini question
              await (tx as any).miniQuestion.create({
                data: {
                  title: contentData.material || `Learning Activity ${i + 1}`,
                  question: contentData.question,
                  description: contentData.question,
                  releaseDate: contentData.releaseDate ? new Date(contentData.releaseDate) : null,
                  orderIndex: i + 1,
                  contentId: contentSection.id
                }
              });
            }
          }

          // Only delete mini questions that are no longer needed AND have no answers
          const miniQuestionsToDelete = existingMiniQuestions.filter((mq: any) => 
            mq.orderIndex > contents.length && mq.miniAnswers.length === 0
          );

          for (const mq of miniQuestionsToDelete) {
            await (tx as any).miniQuestion.delete({
              where: { id: mq.id }
            });
          }

        } else {
          // Handle nested structure - preserve existing mini answers
          // Delete only content sections that have no mini questions with answers
          for (const existingContentItem of existingContent) {
            const hasAnswers = existingContentItem.miniQuestions.some((mq: any) => mq.miniAnswers.length > 0);
            if (!hasAnswers) {
              await (tx as any).content.delete({
                where: { id: existingContentItem.id }
              });
            }
          }

          // Create new content sections (this is safer for nested structure)
          for (let i = 0; i < contents.length; i++) {
            const contentData = contents[i];
            const newContent = await (tx as any).content.create({
              data: {
                title: contentData.title,
                material: contentData.material,
                orderIndex: i + 1,
                questionId
              }
            });

            // Create mini-questions for this content
            if (contentData.miniQuestions && Array.isArray(contentData.miniQuestions)) {
              for (let j = 0; j < contentData.miniQuestions.length; j++) {
                const miniQuestionData = contentData.miniQuestions[j];
                await (tx as any).miniQuestion.create({
                  data: {
                    title: miniQuestionData.title,
                    question: miniQuestionData.question,
                    description: miniQuestionData.description || '',
                    releaseDate: miniQuestionData.releaseDate ? new Date(miniQuestionData.releaseDate) : null,
                    orderIndex: j + 1,
                    contentId: newContent.id
                  }
                });
              }
            }
          }
        }
      }

      return updated;
    });

    // Fetch the complete updated question with content sections
    const completeQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        contents: {
          include: {
            miniQuestions: {
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      } as any
    });

    res.json({ question: completeQuestion });
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
    const { cohortId } = req.query;

    // Build the where clause
    const whereClause: any = {};
    if (cohortId) {
      whereClause.cohortId = cohortId as string;
    }

    const modules = await (prisma as any).module.findMany({
      where: whereClause,
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
            },
            contents: {
              include: {
                miniQuestions: {
                  orderBy: { orderIndex: 'asc' }
                }
              },
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { topicNumber: 'asc' }
        },
        cohort: {
          select: {
            id: true,
            name: true
          }
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
        answers: question.answers,
        contents: question.contents?.reduce((acc: any[], content: any) => {
          // Flatten mini questions into content items for the frontend
          const miniQuestions = content.miniQuestions || [];
          const contentItems = miniQuestions.map((miniQ: any) => ({
            content: miniQ.title,
            description: miniQ.question,
            releaseDate: miniQ.releaseDate ? miniQ.releaseDate.toISOString().slice(0, 16) : null
          }));
          return acc.concat(contentItems);
        }, []) || []
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
      description,
      cohortId
    } = req.body;

    // Validate required fields
    if (!moduleNumber || !title || !description || !cohortId) {
      return res.status(400).json({ 
        error: 'Missing required fields: moduleNumber, title, description, cohortId' 
      });
    }

    // Verify cohort exists
    const cohort = await (prisma as any).cohort.findUnique({
      where: { id: cohortId }
    });

    if (!cohort) {
      return res.status(400).json({ error: 'Cohort not found' });
    }

    // Check if module number already exists in this cohort
    const existingModule = await (prisma as any).module.findFirst({
      where: { 
        moduleNumber: parseInt(moduleNumber),
        cohortId: cohortId
      }
    });

    if (existingModule) {
      return res.status(400).json({ 
        error: `Module ${moduleNumber} already exists in this cohort` 
      });
    }

    const module = await (prisma as any).module.create({
      data: {
        moduleNumber: parseInt(moduleNumber),
        title,
        description,
        cohortId,
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
      bonusPoints,
      contents
    } = req.body;

    // Validate required fields
    if (!topicNumber || !title || !content || !description || !deadline || !points) {
      return res.status(400).json({ 
        error: 'Missing required fields: topicNumber, title, content, description, deadline, points' 
      });
    }

    // Validate assignment deadline against self learning activity release dates
    const assignmentDeadline = new Date(deadline);
    const validationResult = validateAssignmentDeadline(assignmentDeadline, contents || []);
    if (!validationResult.isValid) {
      return res.status(400).json({ 
        error: validationResult.errorMessage 
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

    // Use a transaction to safely get the next unique questionNumber and create contents
    const question = await prisma.$transaction(async (tx) => {
      // Get the highest questionNumber to generate a unique one
      const lastQuestion = await tx.question.findFirst({
        orderBy: { questionNumber: 'desc' }
      });
      const nextQuestionNumber = lastQuestion ? lastQuestion.questionNumber + 1 : 1;

      const createdQuestion = await tx.question.create({
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
          topicNumber: parseInt(topicNumber),
          cohortId: module.cohortId // Use the module's cohortId
        } as any
      });

      // Handle content sections and mini questions if provided
      if (contents && Array.isArray(contents)) {
        // Check if contents is in the flat structure or nested structure
        const isFlat = contents.length > 0 && contents[0].hasOwnProperty('material') && contents[0].hasOwnProperty('question');
        
        if (isFlat) {
          // Handle flat structure - create one content section with multiple mini questions
          if (contents.length > 0) {
            const newContent = await (tx as any).content.create({
              data: {
                title: 'Learning Material',
                material: 'Self-learning content',
                orderIndex: 1,
                questionId: createdQuestion.id
              }
            });

            // Create mini-questions from the flat structure
            for (let i = 0; i < contents.length; i++) {
              const contentData = contents[i];
              await (tx as any).miniQuestion.create({
                data: {
                  title: contentData.material || `Learning Activity ${i + 1}`,
                  question: contentData.question,
                  description: contentData.question,
                  releaseDate: contentData.releaseDate ? new Date(contentData.releaseDate) : null,
                  orderIndex: i + 1,
                  contentId: newContent.id
                }
              });
            }
          }
        } else {
          // Handle nested structure - original logic
          for (let i = 0; i < contents.length; i++) {
            const contentData = contents[i];
            const newContent = await (tx as any).content.create({
              data: {
                title: contentData.title,
                material: contentData.material,
                orderIndex: i + 1,
                questionId: createdQuestion.id
              }
            });

            // Create mini-questions for this content
            if (contentData.miniQuestions && Array.isArray(contentData.miniQuestions)) {
              for (let j = 0; j < contentData.miniQuestions.length; j++) {
                const miniQuestionData = contentData.miniQuestions[j];
                await (tx as any).miniQuestion.create({
                  data: {
                    title: miniQuestionData.title,
                    question: miniQuestionData.question,
                    description: miniQuestionData.description || '',
                    releaseDate: miniQuestionData.releaseDate ? new Date(miniQuestionData.releaseDate) : null,
                    orderIndex: j + 1,
                    contentId: newContent.id
                  }
                });
              }
            }
          }
        }
      }

      return createdQuestion;
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

// ========================================
// CONTENT AND MINI-QUESTION MANAGEMENT ROUTES
// ========================================

// Get content sections for a question
router.get('/questions/:questionId/contents', async (req: AuthRequest, res) => {
  try {
    const questionId = req.params.questionId;
    
    const contents = await (prisma as any).content.findMany({
      where: { questionId },
      include: {
        miniQuestions: {
          include: {
            _count: {
              select: {
                miniAnswers: true
              }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { orderIndex: 'asc' }
    });

    res.json({ contents });
  } catch (error) {
    console.error('Get question contents error:', error);
    res.status(500).json({ error: 'Failed to get question contents' });
  }
});

// Create content section for a question
router.post('/questions/:questionId/contents', async (req: AuthRequest, res) => {
  try {
    const questionId = req.params.questionId;
    const { title, material, miniQuestions } = req.body;

    if (!title || !material) {
      return res.status(400).json({ 
        error: 'Title and material are required' 
      });
    }

    // Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Get next order index
    const lastContent = await (prisma as any).content.findFirst({
      where: { questionId },
      orderBy: { orderIndex: 'desc' }
    });
    const nextOrder = lastContent ? lastContent.orderIndex + 1 : 1;

    const content = await prisma.$transaction(async (tx) => {
      // Create content section
      const newContent = await (tx as any).content.create({
        data: {
          title,
          material,
          orderIndex: nextOrder,
          questionId
        }
      });

      // Create mini-questions if provided
      if (miniQuestions && Array.isArray(miniQuestions)) {
        for (let i = 0; i < miniQuestions.length; i++) {
          const miniQuestionData = miniQuestions[i];
          await (tx as any).miniQuestion.create({
            data: {
              title: miniQuestionData.title,
              question: miniQuestionData.question,
              description: miniQuestionData.description || '',
              orderIndex: i + 1,
              contentId: newContent.id
            }
          });
        }
      }

      return newContent;
    });

    res.status(201).json({ content });
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// Update content section
router.put('/contents/:contentId', async (req: AuthRequest, res) => {
  try {
    const contentId = req.params.contentId;
    const { title, material, isActive } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (material !== undefined) updateData.material = material;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const updatedContent = await (prisma as any).content.update({
      where: { id: contentId },
      data: updateData,
      include: {
        miniQuestions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    res.json({ content: updatedContent });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// Delete content section
router.delete('/contents/:contentId', async (req: AuthRequest, res) => {
  try {
    const contentId = req.params.contentId;
    
    const content = await (prisma as any).content.findUnique({
      where: { id: contentId },
      include: {
        miniQuestions: {
          include: {
            miniAnswers: true
          }
        }
      }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if there are any mini-answers
    const hasAnswers = content.miniQuestions.some((mq: any) => mq.miniAnswers.length > 0);
    if (hasAnswers) {
      return res.status(400).json({ 
        error: 'Cannot delete content with mini-questions that have answers. Please remove answers first.' 
      });
    }

    await (prisma as any).content.delete({
      where: { id: contentId }
    });

    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

// Get mini-answers for a mini-question
router.get('/mini-questions/:miniQuestionId/answers', async (req: AuthRequest, res) => {
  try {
    const miniQuestionId = req.params.miniQuestionId;
    
    const miniAnswers = await (prisma as any).miniAnswer.findMany({
      where: { miniQuestionId },
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

    res.json({ miniAnswers });
  } catch (error) {
    console.error('Get mini-answers error:', error);
    res.status(500).json({ error: 'Failed to get mini-answers' });
  }
});

// Get all mini-answers for admin dashboard
router.get('/mini-answers', async (req: AuthRequest, res) => {
  try {
    const miniAnswers = await (prisma as any).miniAnswer.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            trainName: true,
            email: true
          }
        },
        miniQuestion: {
          select: {
            id: true,
            title: true,
            question: true,
            description: true,
            content: {
              select: {
                id: true,
                title: true,
                question: {
                  select: {
                    id: true,
                    questionNumber: true,
                    title: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json({ miniAnswers });
  } catch (error) {
    console.error('Get all mini-answers error:', error);
    res.status(500).json({ error: 'Failed to get mini-answers' });
  }
});

// Create mini-question for content
router.post('/contents/:contentId/mini-questions', async (req: AuthRequest, res) => {
  try {
    const contentId = req.params.contentId;
    const { title, question, description } = req.body;

    if (!title || !question) {
      return res.status(400).json({ 
        error: 'Title and question are required' 
      });
    }

    // Verify content exists
    const content = await (prisma as any).content.findUnique({
      where: { id: contentId }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Get next order index
    const lastMiniQuestion = await (prisma as any).miniQuestion.findFirst({
      where: { contentId },
      orderBy: { orderIndex: 'desc' }
    });
    const nextOrder = lastMiniQuestion ? lastMiniQuestion.orderIndex + 1 : 1;

    const miniQuestion = await (prisma as any).miniQuestion.create({
      data: {
        title,
        question,
        description: description || '',
        orderIndex: nextOrder,
        contentId
      }
    });

    res.status(201).json({ miniQuestion });
  } catch (error) {
    console.error('Create mini-question error:', error);
    res.status(500).json({ error: 'Failed to create mini-question' });
  }
});

// Update mini-question
router.put('/mini-questions/:miniQuestionId', async (req: AuthRequest, res) => {
  try {
    const miniQuestionId = req.params.miniQuestionId;
    const { title, question, description, isActive } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (question !== undefined) updateData.question = question;
    if (description !== undefined) updateData.description = description;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const updatedMiniQuestion = await (prisma as any).miniQuestion.update({
      where: { id: miniQuestionId },
      data: updateData
    });

    res.json({ miniQuestion: updatedMiniQuestion });
  } catch (error) {
    console.error('Update mini-question error:', error);
    res.status(500).json({ error: 'Failed to update mini-question' });
  }
});

// Delete mini-question
router.delete('/mini-questions/:miniQuestionId', async (req: AuthRequest, res) => {
  try {
    const miniQuestionId = req.params.miniQuestionId;
    
    const miniQuestion = await (prisma as any).miniQuestion.findUnique({
      where: { id: miniQuestionId },
      include: {
        miniAnswers: true
      }
    });

    if (!miniQuestion) {
      return res.status(404).json({ error: 'Mini-question not found' });
    }

    if (miniQuestion.miniAnswers.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete mini-question with existing answers. Please remove answers first.' 
      });
    }

    await (prisma as any).miniQuestion.delete({
      where: { id: miniQuestionId }
    });

    res.json({ message: 'Mini-question deleted successfully' });
  } catch (error) {
    console.error('Delete mini-question error:', error);
    res.status(500).json({ error: 'Failed to delete mini-question' });
  }
});

// Graduate user from cohort
router.post('/graduate-user', async (req: AuthRequest, res) => {
  try {
    const { userId, cohortId } = req.body;

    if (!userId || !cohortId) {
      return res.status(400).json({ error: 'User ID and Cohort ID are required' });
    }

    // Check if the cohort member exists and is active
    const cohortMember = await (prisma as any).cohortMember.findUnique({
      where: {
        userId_cohortId: {
          userId,
          cohortId
        }
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        },
        cohort: {
          select: {
            name: true
          }
        }
      }
    });

    if (!cohortMember) {
      return res.status(404).json({ error: 'User is not a member of this cohort' });
    }

    if (cohortMember.isGraduated) {
      return res.status(400).json({ error: 'User is already graduated from this cohort' });
    }

    // Graduate the user
    const graduatedMember = await (prisma as any).cohortMember.update({
      where: {
        userId_cohortId: {
          userId,
          cohortId
        }
      },
      data: {
        isGraduated: true,
        graduatedAt: new Date(),
        graduatedBy: req.user?.email,
        isActive: false // Set to inactive since they've graduated
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        },
        cohort: {
          select: {
            name: true
          }
        }
      }
    });

    res.json({ 
      message: `${cohortMember.user.fullName} has been graduated from ${cohortMember.cohort.name}`,
      graduatedMember 
    });
  } catch (error) {
    console.error('Graduate user error:', error);
    res.status(500).json({ error: 'Failed to graduate user' });
  }
});

// Enhanced user status management - Change user status in a cohort
router.put('/user-cohort-status', async (req: AuthRequest, res) => {
  try {
    const { userId, cohortId, status } = req.body;

    if (!userId || !cohortId || !status) {
      return res.status(400).json({ error: 'User ID, Cohort ID, and status are required' });
    }

    // Validate status
    const validStatuses = ['ENROLLED', 'GRADUATED', 'REMOVED', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Check if the cohort member exists
    const cohortMember = await (prisma as any).cohortMember.findUnique({
      where: {
        userId_cohortId: {
          userId,
          cohortId
        }
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            currentCohortId: true
          }
        },
        cohort: {
          select: {
            name: true
          }
        }
      }
    });

    if (!cohortMember) {
      return res.status(404).json({ error: 'User is not a member of this cohort' });
    }

    // Update the status
    const updatedMember = await (prisma as any).cohortMember.update({
      where: {
        userId_cohortId: {
          userId,
          cohortId
        }
      },
      data: {
        status: status,
        statusChangedAt: new Date(),
        statusChangedBy: req.user?.email,
        // Update legacy fields for backward compatibility
        isActive: status === 'ENROLLED',
        isGraduated: status === 'GRADUATED',
        graduatedAt: status === 'GRADUATED' ? new Date() : cohortMember.graduatedAt,
        graduatedBy: status === 'GRADUATED' ? req.user?.email : cohortMember.graduatedBy
      }
    });

    // If user is removed or graduated from their current cohort, update their currentCohortId
    if ((status === 'REMOVED' || status === 'GRADUATED') && cohortMember.user.currentCohortId === cohortId) {
      await (prisma as any).user.update({
        where: { id: userId },
        data: { currentCohortId: null }
      });
    }

    res.json({ 
      message: `${cohortMember.user.fullName} status changed to ${status} in ${cohortMember.cohort.name}`,
      updatedMember 
    });
  } catch (error) {
    console.error('Update user cohort status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Assign user to a new cohort
router.post('/assign-user-cohort', async (req: AuthRequest, res) => {
  try {
    const { userId, cohortId } = req.body;

    if (!userId || !cohortId) {
      return res.status(400).json({ error: 'User ID and Cohort ID are required' });
    }

    // Check if user exists
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { 
        fullName: true, 
        email: true, 
        currentCohortId: true,
        cohortMembers: {
          where: { status: 'ENROLLED' },
          include: {
            cohort: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if cohort exists
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { name: true, isActive: true }
    });

    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    if (!cohort.isActive) {
      return res.status(400).json({ error: 'Cannot assign user to inactive cohort' });
    }

    // Check if user is already enrolled in any cohort
    if (user.cohortMembers.length > 0) {
      const currentCohort = user.cohortMembers[0];
      return res.status(400).json({ 
        error: `User is already enrolled in cohort: ${currentCohort.cohort.name}. Please change their status first.` 
      });
    }

    // Check if user already has a membership record for this cohort
    const existingMembership = await (prisma as any).cohortMember.findUnique({
      where: {
        userId_cohortId: {
          userId,
          cohortId
        }
      }
    });

    if (existingMembership) {
      // Update existing membership to ENROLLED
      const updatedMembership = await (prisma as any).cohortMember.update({
        where: {
          userId_cohortId: {
            userId,
            cohortId
          }
        },
        data: {
          status: 'ENROLLED',
          statusChangedAt: new Date(),
          statusChangedBy: req.user?.email,
          isActive: true,
          isGraduated: false
        }
      });

      // Update user's current cohort
      await (prisma as any).user.update({
        where: { id: userId },
        data: { currentCohortId: cohortId }
      });

      res.json({ 
        message: `${user.fullName} has been re-enrolled in ${cohort.name}`,
        membership: updatedMembership
      });
    } else {
      // Create new membership
      const newMembership = await (prisma as any).cohortMember.create({
        data: {
          userId,
          cohortId,
          status: 'ENROLLED',
          statusChangedAt: new Date(),
          statusChangedBy: req.user?.email,
          isActive: true,
          isGraduated: false
        }
      });

      // Update user's current cohort
      await (prisma as any).user.update({
        where: { id: userId },
        data: { currentCohortId: cohortId }
      });

      res.json({ 
        message: `${user.fullName} has been assigned to ${cohort.name}`,
        membership: newMembership
      });
    }
  } catch (error) {
    console.error('Assign user to cohort error:', error);
    res.status(500).json({ error: 'Failed to assign user to cohort' });
  }
});

// Get users with their cohort status for a specific cohort
router.get('/cohort/:cohortId/users', async (req: AuthRequest, res) => {
  try {
    const { cohortId } = req.params;
    const { status } = req.query; // Add support for status filtering

    // Check if cohort exists
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { name: true, isActive: true }
    });

    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    // Build the where clause with optional status filtering
    const whereClause: any = {
      cohortId,
      user: {
        isAdmin: false // Filter out admin users
      }
    };

    // Add status filter if provided
    if (status && typeof status === 'string') {
      whereClause.status = status.toUpperCase();
    }

    // Get all users with their status in this cohort
    const cohortMembers = await (prisma as any).cohortMember.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            trainName: true,
            currentStep: true,
            createdAt: true,
            currentCohortId: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { user: { fullName: 'asc' } }
      ]
    });

    // Get available status options for filtering
    const allStatuses = await (prisma as any).cohortMember.findMany({
      where: {
        cohortId,
        user: {
          isAdmin: false
        }
      },
      select: {
        status: true
      },
      distinct: ['status']
    });

    const availableStatuses = allStatuses.map((item: any) => item.status);

    res.json({ 
      cohort,
      members: cohortMembers.map((member: any) => ({
        ...member.user,
        cohortStatus: member.status,
        joinedAt: member.joinedAt,
        statusChangedAt: member.statusChangedAt,
        statusChangedBy: member.statusChangedBy,
        graduatedAt: member.graduatedAt,
        graduatedBy: member.graduatedBy,
        isCurrentCohort: member.user.currentCohortId === cohortId,
        // Add additional cohort membership details
        currentStep: member.currentStep || member.user.currentStep,
        isActive: member.isActive
      })),
      filters: {
        availableStatuses,
        currentFilter: status || 'all'
      }
    });
  } catch (error) {
    console.error('Get cohort users error:', error);
    res.status(500).json({ error: 'Failed to get cohort users' });
  }
});

// Get all users with their current cohort info
router.get('/users-with-cohorts', async (req: AuthRequest, res) => {
  try {
    const users = await (prisma as any).user.findMany({
      where: { isAdmin: false },
      include: {
        currentCohort: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        },
        cohortMembers: {
          include: {
            cohort: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          },
          orderBy: { statusChangedAt: 'desc' }
        }
      },
      orderBy: [
        { currentStep: 'desc' },
        { fullName: 'asc' }
      ]
    });

    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      trainName: user.trainName,
      currentStep: user.currentStep,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      currentCohort: user.currentCohort,
      allCohorts: user.cohortMembers.map((member: any) => ({
        cohortId: member.cohortId,
        cohortName: member.cohort.name,
        status: member.status,
        joinedAt: member.joinedAt,
        statusChangedAt: member.statusChangedAt,
        statusChangedBy: member.statusChangedBy,
        isActive: member.cohort.isActive
      }))
    }));

    res.json({ users: formattedUsers });
  } catch (error) {
    console.error('Get users with cohorts error:', error);
    res.status(500).json({ error: 'Failed to get users with cohort information' });
  }
});

export default router;
