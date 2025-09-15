import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import emailService from '../services/emailService';
import fs from 'fs';
import path from 'path';

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

    // Calculate total points for each user
    const usersWithPoints = await Promise.all(
      users.map(async (user) => {
        const totalPoints = await (prisma as any).answer.aggregate({
          where: {
            userId: user.id,
            status: 'APPROVED',
            gradePoints: { not: null }
          },
          _sum: {
            gradePoints: true
          }
        });

        return {
          ...user,
          totalPoints: totalPoints._sum.gradePoints || 0
        };
      })
    );

    res.json({ users: usersWithPoints });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get game statistics (filtered by admin's cohort access)
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const adminUserId = req.user!.id;
    const requestedCohortId = req.query.cohortId as string; // Get cohort filter from query params
    
    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { isAdmin: true }
    });

    let cohortIds: string[] = [];
    
    if (adminUser?.isAdmin) {
      // If a specific cohort is requested, only use that cohort
      if (requestedCohortId) {
        // Verify the requested cohort exists (removed isActive requirement for admin)
        const requestedCohort = await prisma.cohort.findFirst({
          where: { 
            id: requestedCohortId
          }
        });
        
        if (requestedCohort) {
          cohortIds = [requestedCohortId];
        } else {
          return res.status(400).json({ error: 'Invalid cohort specified' });
        }
      } else {
        // If no specific cohort requested, get all active cohorts (legacy behavior)
        const allCohorts = await prisma.cohort.findMany({
          where: { isActive: true },
          select: { id: true }
        });
        cohortIds = allCohorts.map(c => c.id);
      }
    } else {
      // For non-admin users, get their cohort access (original logic)
      const adminCohorts = await prisma.cohortMember.findMany({
        where: { 
          userId: adminUserId,
          status: 'ENROLLED'
        },
        select: {
          cohortId: true
        }
      });
      cohortIds = adminCohorts.map(ac => ac.cohortId);
      
      // If a specific cohort is requested, ensure admin has access to it
      if (requestedCohortId && !cohortIds.includes(requestedCohortId)) {
        return res.status(403).json({ error: 'Access denied to specified cohort' });
      } else if (requestedCohortId) {
        cohortIds = [requestedCohortId];
      }
    }

    if (cohortIds.length === 0) {
      return res.json({
        totalUsers: 0,
        totalAnswers: 0,
        pendingAnswers: 0,
        averageProgress: 0
      });
    }

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
    const requestedCohortId = req.query.cohortId as string; // Get cohort filter from query params
    
    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { isAdmin: true }
    });

    let cohortIds: string[] = [];
    
    if (adminUser?.isAdmin) {
      // If a specific cohort is requested, only use that cohort
      if (requestedCohortId) {
        // Verify the requested cohort exists (removed isActive requirement for admin)
        const requestedCohort = await prisma.cohort.findFirst({
          where: { 
            id: requestedCohortId
          }
        });
        
        if (requestedCohort) {
          cohortIds = [requestedCohortId];
        } else {
          return res.status(400).json({ error: 'Invalid cohort specified' });
        }
      } else {
        // If no specific cohort requested, get all active cohorts (legacy behavior)
        const allCohorts = await prisma.cohort.findMany({
          where: { isActive: true },
          select: { id: true }
        });
        cohortIds = allCohorts.map(c => c.id);
      }
    } else {
      // For non-admin users, get their cohort access (original logic)
      const adminCohorts = await prisma.cohortMember.findMany({
        where: { 
          userId: adminUserId,
          status: 'ENROLLED'
        },
        select: {
          cohortId: true
        }
      });
      cohortIds = adminCohorts.map(ac => ac.cohortId);
      
      // If a specific cohort is requested, ensure admin has access to it
      if (requestedCohortId && !cohortIds.includes(requestedCohortId)) {
        return res.status(403).json({ error: 'Access denied to specified cohort' });
      } else if (requestedCohortId) {
        cohortIds = [requestedCohortId];
      }
    }

    // If no cohort access, return empty
    if (cohortIds.length === 0) {
      return res.json({ pendingAnswers: [] });
    }

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

    // Map answers to include attachment information
    const answersWithAttachments = pendingAnswers.map(answer => ({
      ...answer,
      hasAttachment: !!answer.attachmentFileName,
      attachmentInfo: answer.attachmentFileName ? {
        fileName: answer.attachmentFileName,
        fileSize: answer.attachmentFileSize,
        mimeType: answer.attachmentMimeType
      } : null
    }));

    res.json({ pendingAnswers: answersWithAttachments });
  } catch (error) {
    console.error('Get pending answers error:', error);
    res.status(500).json({ error: 'Failed to get pending answers' });
  }
});

// Get resubmission requests
router.get('/resubmission-requests', async (req: AuthRequest, res) => {
  try {
    const adminUserId = req.user!.id;
    const requestedCohortId = req.query.cohortId as string;
    
    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { isAdmin: true }
    });

    let cohortIds: string[] = [];
    
    if (adminUser?.isAdmin) {
      if (requestedCohortId) {
        const requestedCohort = await prisma.cohort.findFirst({
          where: { id: requestedCohortId }
        });
        
        if (requestedCohort) {
          cohortIds = [requestedCohortId];
        } else {
          return res.status(400).json({ error: 'Invalid cohort specified' });
        }
      } else {
        const allCohorts = await prisma.cohort.findMany({
          where: { isActive: true },
          select: { id: true }
        });
        cohortIds = allCohorts.map(c => c.id);
      }
    } else {
      const adminCohorts = await prisma.cohortMember.findMany({
        where: { 
          userId: adminUserId,
          status: 'ENROLLED'
        },
        select: { cohortId: true }
      });
      cohortIds = adminCohorts.map(ac => ac.cohortId);
      
      if (requestedCohortId && !cohortIds.includes(requestedCohortId)) {
        return res.status(403).json({ error: 'Access denied to specified cohort' });
      } else if (requestedCohortId) {
        cohortIds = [requestedCohortId];
      }
    }

    if (cohortIds.length === 0) {
      return res.json({ resubmissionRequests: [] });
    }

    const resubmissionRequests = await prisma.answer.findMany({
      where: { 
        resubmissionRequested: true,
        resubmissionApproved: null, // Only pending requests
        cohortId: { in: cohortIds }
      } as any, // Type assertion for fields that exist in schema but may not be in generated types
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
      orderBy: { submittedAt: 'desc' } // Use submittedAt instead of resubmissionRequestedAt
    });

    const requestsWithInfo = resubmissionRequests.map(answer => ({
      ...answer,
      hasAttachment: !!answer.attachmentFileName,
      attachmentInfo: answer.attachmentFileName ? {
        fileName: answer.attachmentFileName,
        fileSize: answer.attachmentFileSize,
        mimeType: answer.attachmentMimeType
      } : null
    }));

    res.json({ resubmissionRequests: requestsWithInfo });
  } catch (error) {
    console.error('Get resubmission requests error:', error);
    res.status(500).json({ error: 'Failed to get resubmission requests' });
  }
});

// Review an answer with grading system
router.put('/answer/:answerId/review', async (req: AuthRequest, res) => {
  try {
    const { answerId } = req.params;
    const { grade, feedback } = req.body;
    const adminId = req.user!.id;

    // Define grade levels and their properties
    const gradeConfig = {
      'GOLD': { status: 'APPROVED', points: 100, passThreshold: true },
      'SILVER': { status: 'APPROVED', points: 85, passThreshold: true },
      'COPPER': { status: 'APPROVED', points: 70, passThreshold: true },
      'NEEDS_RESUBMISSION': { status: 'REJECTED', points: 0, passThreshold: false }
    };

    if (!gradeConfig[grade as keyof typeof gradeConfig]) {
      return res.status(400).json({ 
        error: 'Mastery points must be one of: GOLD, SILVER, COPPER, NEEDS_RESUBMISSION' 
      });
    }

    // Require feedback for all grades
    if (!feedback || feedback.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Feedback is required when grading an answer' 
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

    const gradeDetails = gradeConfig[grade as keyof typeof gradeConfig];

    // Update answer with grade and status
    const updatedAnswer = await prisma.answer.update({
      where: { id: answerId },
      data: {
        status: gradeDetails.status,
        grade: grade,
        gradePoints: gradeDetails.points,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        feedback,
        pointsAwarded: gradeDetails.points,
        // Automatically approve resubmission for NEEDS_RESUBMISSION grade
        resubmissionRequested: grade === 'NEEDS_RESUBMISSION' ? true : false,
        resubmissionApproved: grade === 'NEEDS_RESUBMISSION' ? true : null,
        resubmissionRequestedAt: grade === 'NEEDS_RESUBMISSION' ? new Date() : null
      } as any // Type assertion for fields that exist in schema but may not be in generated types
    });

    // If approved (grade is not NEEDS_RESUBMISSION), update user's progress
    if (gradeDetails.passThreshold) {
      let newStep = answer.user.currentStep;
      
      // Update progress based on question
      if (answer.question) {
        newStep = Math.max(answer.user.currentStep, answer.question.questionNumber);
      }
      
      await prisma.user.update({
        where: { id: answer.userId },
        data: {
          currentStep: newStep
        }
      });

      // Also update the cohort member's current step
      const cohortMember = await (prisma as any).cohortMember.findFirst({
        where: {
          userId: answer.userId,
          status: 'ENROLLED',
          isActive: true
        }
      });

      if (cohortMember) {
        await (prisma as any).cohortMember.update({
          where: { id: cohortMember.id },
          data: {
            currentStep: newStep
          }
        });
      }
    }

    // Send email notification to user
    try {
      const questionTitle = `Question ${answer.question?.questionNumber || 'N/A'}`;
      await emailService.sendAnswerFeedbackEmail(
        answer.user.email,
        answer.user.fullName,
        questionTitle,
        answer.question?.questionNumber || 0,
        grade,
        feedback
      );
      console.log(`✅ Feedback email sent to ${answer.user.email} for ${questionTitle}`);
    } catch (emailError) {
      console.error('❌ Failed to send feedback email:', emailError);
      // Don't fail the request if email sending fails
    }

    res.json({
      message: `Answer graded as ${grade} successfully`,
      answer: updatedAnswer,
      grade: grade,
      points: gradeDetails.points
    });
  } catch (error) {
    console.error('Review answer error:', error);
    res.status(500).json({ error: 'Failed to review answer' });
  }
});

// Handle resubmission requests
router.put('/answer/:answerId/resubmission-request', async (req: AuthRequest, res) => {
  try {
    const { answerId } = req.params;
    const { approve } = req.body; // true to approve, false to reject
    const adminId = req.user!.id;

    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: {
        user: true,
        question: true
      }
    });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    if (!(answer as any).resubmissionRequested) {
      return res.status(400).json({ error: 'No resubmission request found for this answer' });
    }

    if ((answer as any).resubmissionApproved !== null) {
      return res.status(400).json({ error: 'Resubmission request has already been reviewed' });
    }

    const updatedAnswer = await prisma.answer.update({
      where: { id: answerId },
      data: {
        resubmissionApproved: approve,
        reviewedAt: new Date(),
        reviewedBy: adminId
      } as any // Type assertion for fields that exist in schema but may not be in generated types
    });

    // Send email notification to user when resubmission is approved
    if (approve) {
      try {
        await emailService.sendResubmissionApprovalEmail(
          answer.user.email,
          answer.user.fullName,
          answer.question.title
        );
      } catch (emailError) {
        console.error('Failed to send resubmission approval email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      message: `Resubmission request ${approve ? 'approved' : 'rejected'} successfully`,
      answer: updatedAnswer
    });
  } catch (error) {
    console.error('Handle resubmission request error:', error);
    res.status(500).json({ error: 'Failed to handle resubmission request' });
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
    
    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { isAdmin: true }
    });

    let cohortIds: string[] = [];
    
    if (adminUser?.isAdmin) {
      // For admin users, get all active cohorts instead of requiring membership
      const allCohorts = await prisma.cohort.findMany({
        where: { isActive: true },
        select: { id: true }
      });
      cohortIds = allCohorts.map(c => c.id);
    } else {
      // For non-admin users, get their cohort access
      const adminCohorts = await prisma.cohortMember.findMany({
        where: { 
          userId: adminUserId,
          status: 'ENROLLED'
        },
        select: {
          cohortId: true
        }
      });
      cohortIds = adminCohorts.map(ac => ac.cohortId);
    }

    if (cohortIds.length === 0) {
      return res.json({ answers: [] });
    }
    
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
                  resourceUrl: miniQuestionData.resourceUrl || null, // NEW: Add resourceUrl field
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
          // IMPORTANT: For flat structure, we should only work with the FIRST content section
          // to avoid mixing mini questions from different content sections
          let contentSection = existingContent.find((content: any) => content.orderIndex === 1) || existingContent[0];
          
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

          // Get existing mini questions ONLY for THIS specific content section
          const existingMiniQuestions = await (tx as any).miniQuestion.findMany({
            where: { 
              contentId: contentSection.id  // Only this content section!
            },
            include: { miniAnswers: true },
            orderBy: { orderIndex: 'asc' }
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
                  resourceUrl: contentData.resourceUrl || null, // NEW: Add resourceUrl field
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
                  resourceUrl: contentData.resourceUrl || null, // NEW: Add resourceUrl field
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

          // IMPORTANT: For flat structure, remove any extra content sections that might cause confusion
          // Keep only the first content section (the one we're working with)
          const contentSectionsToRemove = existingContent.filter((content: any) => 
            content.id !== contentSection.id && 
            content.miniQuestions.every((mq: any) => mq.miniAnswers.length === 0)
          );

          for (const content of contentSectionsToRemove) {
            // Delete mini questions first
            await (tx as any).miniQuestion.deleteMany({
              where: { contentId: content.id }
            });
            // Then delete the content section
            await (tx as any).content.delete({
              where: { id: content.id }
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
                    resourceUrl: miniQuestionData.resourceUrl || null,
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
      theme: module.theme, // Add theme field
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
            resourceUrl: miniQ.resourceUrl,
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

// Update module theme
router.put('/modules/:moduleId/theme', async (req: AuthRequest, res) => {
  try {
    const moduleId = req.params.moduleId;
    const { theme } = req.body;

    if (!theme) {
      return res.status(400).json({ error: 'Theme is required' });
    }

    // Validate theme value
    const validThemes = ['trains', 'planes', 'sailboat', 'cars', 'f1'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ 
        error: `Invalid theme. Must be one of: ${validThemes.join(', ')}` 
      });
    }

    // Find the module by ID
    const module = await (prisma as any).module.findUnique({
      where: { id: moduleId }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const updatedModule = await (prisma as any).module.update({
      where: { id: moduleId },
      data: { theme }
    });

    res.json({ module: updatedModule });
  } catch (error) {
    console.error('Update module theme error:', error);
    res.status(500).json({ error: 'Failed to update module theme' });
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

    console.log('📥 Received assignment creation request:', {
      moduleId,
      body: req.body,
      extractedFields: {
        topicNumber,
        title: title?.length ? `"${title}"` : 'EMPTY',
        content: content?.length ? `"${content.substring(0, 50)}..."` : 'EMPTY',
        description: description?.length ? `"${description.substring(0, 50)}..."` : 'EMPTY',
        deadline,
        points,
        bonusPoints,
        contentsCount: contents?.length || 0
      }
    });

    // Validate required fields
    if (!topicNumber || !title || !content || !description || !deadline || !points) {
      console.log('❌ Validation failed - missing required fields:', {
        topicNumber: !!topicNumber,
        title: !!title,
        content: !!content,
        description: !!description,
        deadline: !!deadline,
        points: !!points
      });
      return res.status(400).json({ 
        error: 'Missing required fields: topicNumber, title, content, description, deadline, points' 
      });
    }

    // Verify module exists
    console.log('🔍 Checking if module exists:', moduleId);
    const module = await (prisma as any).module.findUnique({
      where: { id: moduleId }
    });

    if (!module) {
      console.log('❌ Module not found:', moduleId);
      return res.status(404).json({ error: 'Module not found' });
    }
    console.log('✅ Module found:', module.title);

    // Check if topic number already exists in this module
    console.log('🔍 Checking for existing topic with number:', topicNumber, 'in module:', moduleId);
    const existingTopic = await prisma.question.findFirst({
      where: { 
        moduleId,
        topicNumber: parseInt(topicNumber)
      } as any
    });

    if (existingTopic) {
      console.log('❌ Topic number already exists:', {
        existingTopicId: existingTopic.id,
        existingTopicTitle: existingTopic.title,
        topicNumber: existingTopic.topicNumber
      });
      return res.status(400).json({ 
        error: `Assignment ${topicNumber} already exists in this module. Please use a different assignment number.` 
      });
    }
    console.log('✅ Topic number is available');

    // Validate assignment deadline against self learning activity release dates
    console.log('🔍 Validating assignment deadline against self learning activities...');
    const assignmentDeadline = new Date(deadline);
    const validationResult = validateAssignmentDeadline(assignmentDeadline, contents || []);
    if (!validationResult.isValid) {
      console.log('❌ Assignment deadline validation failed:', validationResult.errorMessage);
      return res.status(400).json({ 
        error: validationResult.errorMessage 
      });
    }
    console.log('✅ Assignment deadline validation passed');

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
                  resourceUrl: contentData.resourceUrl || null,
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
                    resourceUrl: miniQuestionData.resourceUrl || null,
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

    // Send email notifications to all cohort users
    try {
      if (updatedQuestion.cohortId) {
        // Get all enrolled users in the cohort
        const cohortUsers = await prisma.cohortMember.findMany({
          where: {
            cohortId: updatedQuestion.cohortId,
            status: 'ENROLLED'
          },
          include: {
            user: {
              select: {
                email: true,
                fullName: true
              }
            }
          }
        });

        // Send emails to all enrolled users
        for (const member of cohortUsers) {
          try {
            await emailService.sendNewQuestionEmail(
              member.user.email,
              member.user.fullName,
              updatedQuestion.title,
              updatedQuestion.topicNumber || updatedQuestion.questionNumber
            );
          } catch (emailError) {
            console.error(`❌ Failed to send topic release email to ${member.user.email}:`, emailError);
          }
        }
        
        console.log(`📧 Sent topic release notifications to ${cohortUsers.length} users in cohort for topic "${updatedQuestion.title}"`);
      }
    } catch (emailError) {
      console.error('❌ Failed to send topic release emails:', emailError);
    }

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
    const adminUserId = req.user!.id;
    const requestedCohortId = req.query.cohortId as string;
    
    // First verify the question exists and get its cohort
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, cohortId: true }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { isAdmin: true }
    });

    let hasAccess = false;

    if (adminUser?.isAdmin) {
      // Admin users have access to all questions
      hasAccess = true;
    } else {
      // Non-admin users need to have access to the question's cohort
      const adminCohorts = await prisma.cohortMember.findMany({
        where: { 
          userId: adminUserId,
          status: 'ENROLLED',
          cohortId: question.cohortId
        }
      });
      hasAccess = adminCohorts.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this question' });
    }
    
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
    const adminUserId = req.user!.id;
    
    // First get the mini-question and its related cohort info
    const miniQuestion = await (prisma as any).miniQuestion.findUnique({
      where: { id: miniQuestionId },
      include: {
        content: {
          include: {
            question: {
              select: { cohortId: true }
            }
          }
        }
      }
    });

    if (!miniQuestion) {
      return res.status(404).json({ error: 'Mini-question not found' });
    }

    const questionCohortId = miniQuestion.content.question.cohortId;

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { isAdmin: true }
    });

    let hasAccess = false;

    if (adminUser?.isAdmin) {
      // Admin users have access to all mini-questions
      hasAccess = true;
    } else {
      // Non-admin users need to have access to the question's cohort
      const adminCohorts = await prisma.cohortMember.findMany({
        where: { 
          userId: adminUserId,
          status: 'ENROLLED',
          cohortId: questionCohortId
        }
      });
      hasAccess = adminCohorts.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this mini-question' });
    }
    
    // Filter mini answers to only show users from the same cohort as the question
    const miniAnswers = await (prisma as any).miniAnswer.findMany({
      where: { 
        miniQuestionId,
        user: {
          currentCohortId: questionCohortId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            trainName: true,
            email: true,
            currentCohortId: true
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
    const adminUserId = req.user!.id;
    const requestedCohortId = req.query.cohortId as string; // Get cohort filter from query params
    
    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { isAdmin: true }
    });

    let cohortIds: string[] = [];
    
    if (adminUser?.isAdmin) {
      // If a specific cohort is requested, only use that cohort
      if (requestedCohortId) {
        // Verify the requested cohort exists (removed isActive requirement for admin)
        const requestedCohort = await prisma.cohort.findFirst({
          where: { 
            id: requestedCohortId
          }
        });
        
        if (!requestedCohort) {
          return res.status(400).json({ error: 'Invalid cohort specified' });
        }
        
        cohortIds = [requestedCohortId];
      } else {
        // For admin users, get all cohorts (removed isActive requirement)
        const allCohorts = await prisma.cohort.findMany({
          select: { id: true }
        });
        cohortIds = allCohorts.map(c => c.id);
      }
    } else {
      // For non-admin users, get their cohort access
      const adminCohorts = await prisma.cohortMember.findMany({
        where: { 
          userId: adminUserId,
          status: 'ENROLLED'
        },
        select: {
          cohortId: true
        }
      });
      cohortIds = adminCohorts.map(ac => ac.cohortId);
      
      // If a specific cohort is requested, ensure admin has access to it
      if (requestedCohortId && !cohortIds.includes(requestedCohortId)) {
        return res.status(403).json({ error: 'Access denied to specified cohort' });
      } else if (requestedCohortId) {
        cohortIds = [requestedCohortId];
      }
    }

    if (cohortIds.length === 0) {
      return res.json({ miniAnswers: [] });
    }

    // Get mini answers filtered by cohort - filter by user's cohort membership OR current cohort
    const miniAnswers = await (prisma as any).miniAnswer.findMany({
      where: {
        OR: [
          // Filter by users who have active membership in the requested cohorts
          {
            user: {
              cohortMembers: {
                some: {
                  cohortId: { in: cohortIds },
                  status: 'ENROLLED'
                }
              }
            }
          },
          // Also include users whose current cohort matches (for backward compatibility)
          {
            user: {
              currentCohortId: { in: cohortIds }
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            trainName: true,
            email: true,
            currentCohortId: true
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

// Request resubmission for a mini-answer (admin requests user to update their answer)
router.post('/mini-answer/:miniAnswerId/request-resubmission', async (req: AuthRequest, res) => {
  try {
    const { miniAnswerId } = req.params;
    const { userId } = req.body;
    const adminId = req.user!.id;

    // Verify mini-answer exists and belongs to the specified user
    const miniAnswer = await (prisma as any).miniAnswer.findUnique({
      where: { id: miniAnswerId },
      include: {
        user: true,
        miniQuestion: {
          include: {
            content: {
              include: {
                question: true
              }
            }
          }
        }
      }
    });

    if (!miniAnswer) {
      return res.status(404).json({ error: 'Mini-answer not found' });
    }

    if (miniAnswer.userId !== userId) {
      return res.status(400).json({ error: 'Mini-answer does not belong to the specified user' });
    }

    // Update mini-answer to mark as requiring resubmission
    const updatedMiniAnswer = await (prisma as any).miniAnswer.update({
      where: { id: miniAnswerId },
      data: {
        resubmissionRequested: true,
        resubmissionRequestedAt: new Date(),
        resubmissionRequestedBy: adminId
      }
    });

    // Send email notification to user
    try {
      await emailService.sendMiniAnswerResubmissionRequestEmail(
        miniAnswer.user.email,
        miniAnswer.user.fullName,
        miniAnswer.miniQuestion.title,
        miniAnswer.miniQuestion.content.title,
        miniAnswer.miniQuestion.content.question.title
      );
      console.log(`✅ Resubmission request email sent to ${miniAnswer.user.email} for mini-question "${miniAnswer.miniQuestion.title}"`);
    } catch (emailError) {
      console.error('❌ Failed to send resubmission request email:', emailError);
      // Don't fail the request if email sending fails
    }

    res.json({ 
      message: `Resubmission requested for ${miniAnswer.user.fullName}'s answer to "${miniAnswer.miniQuestion.title}"`,
      miniAnswer: updatedMiniAnswer 
    });
  } catch (error) {
    console.error('Request mini-answer resubmission error:', error);
    res.status(500).json({ error: 'Failed to request resubmission' });
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
    const { title, question, description, resourceUrl, isActive } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (question !== undefined) updateData.question = question;
    if (description !== undefined) updateData.description = description;
    if (resourceUrl !== undefined) updateData.resourceUrl = resourceUrl;
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

    // If user is enrolled in this cohort, set it as their current cohort
    if (status === 'ENROLLED') {
      await (prisma as any).user.update({
        where: { id: userId },
        data: { currentCohortId: cohortId }
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
        error: `User is already enrolled in cohort: ${currentCohort.cohort.name} - ${currentCohort.cohort.cohortNumber}. Please change their status first.` 
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

    // Calculate total points for each user and format response
    const membersWithPoints = await Promise.all(
      cohortMembers.map(async (member: any) => {
        const totalPoints = await (prisma as any).answer.aggregate({
          where: {
            userId: member.user.id,
            status: 'APPROVED',
            gradePoints: { not: null }
          },
          _sum: {
            gradePoints: true
          }
        });

        return {
          ...member.user,
          totalPoints: totalPoints._sum.gradePoints || 0,
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
        };
      })
    );

    res.json({ 
      cohort,
      members: membersWithPoints,
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
            cohortNumber: true,
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

// Update cohort (for theme management and other settings)
router.patch('/cohorts/:cohortId', async (req: AuthRequest, res) => {
  try {
    const { cohortId } = req.params;
    const { name, description, defaultTheme, cohortNumber, isActive } = req.body;

    console.log(`🔧 Updating cohort ${cohortId} with data:`, { name, description, defaultTheme, cohortNumber, isActive });

    // Verify cohort exists
    const existingCohort = await prisma.cohort.findUnique({
      where: { id: cohortId }
    });

    if (!existingCohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    // Prepare update data
    const updateData: any = {};
    
    // Validate name + cohortNumber combination uniqueness
    const finalName = name !== undefined ? name : existingCohort.name;
    const finalCohortNumber = cohortNumber !== undefined ? parseInt(cohortNumber) : (existingCohort as any).cohortNumber;

    // Check if the new name+number combination is unique (excluding current cohort)
    if (name !== undefined || cohortNumber !== undefined) {
      const existingCombination = await prisma.cohort.findFirst({
        where: {
          name: finalName,
          cohortNumber: finalCohortNumber,
          id: { not: cohortId }
        } as any // Type assertion for cohortNumber field
      });

      if (existingCombination) {
        return res.status(400).json({ 
          error: `A cohort with name "${finalName}" and number ${finalCohortNumber} already exists` 
        });
      }
    }

    if (name !== undefined) updateData.name = name;
    if (cohortNumber !== undefined) updateData.cohortNumber = parseInt(cohortNumber);
    if (description !== undefined) updateData.description = description;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (defaultTheme !== undefined) {
      // Validate theme
      const validThemes = ['trains', 'planes', 'sailboat', 'cars', 'f1'];
      if (!validThemes.includes(defaultTheme)) {
        return res.status(400).json({ error: 'Invalid theme. Must be one of: ' + validThemes.join(', ') });
      }
      updateData.defaultTheme = defaultTheme;
    }

    // Update cohort
    const updatedCohort = await prisma.cohort.update({
      where: { id: cohortId },
      data: updateData
    });

    console.log(`✅ Cohort updated successfully:`, updatedCohort);
    res.json({ cohort: updatedCohort });
  } catch (error) {
    console.error('Update cohort error:', error);
    res.status(500).json({ error: 'Failed to update cohort' });
  }
});

// Update module theme
router.patch('/modules/:moduleId/theme', async (req: AuthRequest, res) => {
  try {
    const { moduleId } = req.params;
    const { theme } = req.body;

    console.log(`🎨 Updating module ${moduleId} theme to:`, theme);

    // Validate theme
    const validThemes = ['trains', 'planes', 'sailboat', 'cars', 'f1'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme. Must be one of: ' + validThemes.join(', ') });
    }

    // Verify module exists
    const existingModule = await (prisma as any).module.findUnique({
      where: { id: moduleId }
    });

    if (!existingModule) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Update module theme
    const updatedModule = await (prisma as any).module.update({
      where: { id: moduleId },
      data: { theme }
    });

    console.log(`✅ Module theme updated successfully:`, updatedModule);
    res.json({ module: updatedModule });
  } catch (error) {
    console.error('Update module theme error:', error);
    res.status(500).json({ error: 'Failed to update module theme' });
  }
});

// Download attachment file for an answer
router.get('/answer/:answerId/attachment', async (req: AuthRequest, res) => {
  try {
    const { answerId } = req.params;
    const adminUserId = req.user!.id;
    
    console.log(`📥 Download request for answer ${answerId} by user ${adminUserId}`);
    
    // Verify admin access (additional check even though middleware should handle this)
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { isAdmin: true, email: true }
    });

    console.log(`👤 User details:`, { userId: adminUserId, isAdmin: adminUser?.isAdmin, email: adminUser?.email });

    if (!adminUser?.isAdmin) {
      console.log(`❌ Access denied - user is not admin`);
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get the answer with attachment info
    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      select: {
        attachmentFileName: true,
        attachmentFilePath: true,
        attachmentMimeType: true,
        cohortId: true
      }
    });

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    if (!answer.attachmentFileName || !answer.attachmentFilePath) {
      return res.status(404).json({ error: 'No attachment found for this answer' });
    }

    // Check if file exists
    if (!fs.existsSync(answer.attachmentFilePath)) {
      return res.status(404).json({ error: 'Attachment file not found on server' });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${answer.attachmentFileName}"`);
    res.setHeader('Content-Type', answer.attachmentMimeType || 'application/octet-stream');

    // Stream the file
    const fileStream = fs.createReadStream(answer.attachmentFilePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});

// Send bulk email to cohort users
router.post('/cohorts/:cohortId/send-email', async (req: AuthRequest, res) => {
  try {
    const { cohortId } = req.params;
    const { subject, message, emailType } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Get all enrolled users in the cohort
    const cohortUsers = await prisma.cohortMember.findMany({
      where: {
        cohortId: cohortId,
        status: 'ENROLLED'
      },
      include: {
        user: {
          select: {
            email: true,
            fullName: true
          }
        },
        cohort: {
          select: {
            name: true
          }
        }
      }
    });

    if (cohortUsers.length === 0) {
      return res.status(404).json({ error: 'No enrolled users found in cohort' });
    }

    // Create HTML email template
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">${subject}</h1>
          <p style="color: #64748b; font-size: 16px;">Message from BVisionRY Lighthouse Team</p>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <div style="color: #475569; line-height: 1.6; white-space: pre-line;">
            ${message}
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 14px;">
            Best regards,<br>
            The BVisionRY Lighthouse Team
          </p>
        </div>
      </div>
    `;

    // Send emails to all users
    const results = await emailService.sendBulkEmailToCohort(
      cohortUsers.map(user => user.user.email),
      subject,
      html
    );

    // Log the activity
    console.log(`📧 Bulk email sent to cohort "${cohortUsers[0].cohort.name}": ${results.success} successful, ${results.failed} failed`);

    res.json({
      message: `Email sent to ${results.success} users successfully`,
      details: {
        cohortName: cohortUsers[0].cohort.name,
        totalUsers: cohortUsers.length,
        successful: results.success,
        failed: results.failed
      }
    });
  } catch (error) {
    console.error('Send bulk email error:', error);
    res.status(500).json({ error: 'Failed to send bulk email' });
  }
});

export default router;
