import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all cohorts (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cohorts = await (prisma as any).cohort.findMany({
      include: {
        _count: {
          select: {
            cohortMembers: {
              where: {
                isActive: true,
                user: {
                  isAdmin: false
                }
              }
            },
            modules: true,
            questions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ cohorts });
  } catch (error) {
    console.error('Error fetching cohorts:', error);
    res.status(500).json({ message: 'Failed to fetch cohorts' });
  }
});

// Create new cohort (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, startDate, endDate, cohortNumber } = req.body;

    if (!name || !startDate) {
      return res.status(400).json({ message: 'Name and start date are required' });
    }

    // Handle cohort number assignment
    let assignedCohortNumber: number;
    if (cohortNumber !== undefined) {
      // If cohortNumber is provided, check if name+number combination is unique
      const existingCombination = await (prisma as any).cohort.findUnique({
        where: { 
          name_cohortNumber: {
            name: name,
            cohortNumber: parseInt(cohortNumber)
          }
        }
      });

      if (existingCombination) {
        return res.status(400).json({ message: `A cohort with name "${name}" and number ${cohortNumber} already exists` });
      }

      assignedCohortNumber = parseInt(cohortNumber);
    } else {
      // Auto-assign next available cohort number for this name
      const lastCohortWithSameName = await (prisma as any).cohort.findFirst({
        where: { name: name },
        orderBy: { cohortNumber: 'desc' }
      });

      assignedCohortNumber = lastCohortWithSameName ? lastCohortWithSameName.cohortNumber + 1 : 1;
    }

    const cohort = await (prisma as any).cohort.create({
      data: {
        cohortNumber: assignedCohortNumber,
        name,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true
      },
      include: {
        _count: {
          select: {
            cohortMembers: {
              where: {
                isActive: true,
                user: {
                  isAdmin: false
                }
              }
            },
            modules: true,
            questions: true
          }
        }
      }
    });

    // Create default game config for the cohort
    await (prisma as any).cohortGameConfig.create({
      data: {
        cohortId: cohort.id,
        questionReleaseIntervalHours: 48,
        totalQuestions: 12,
        gameStartDate: new Date(startDate)
      }
    });

    res.status(201).json({ cohort });
  } catch (error) {
    console.error('Error creating cohort:', error);
    res.status(500).json({ message: 'Failed to create cohort' });
  }
});

// Update cohort (admin only)
router.patch('/:cohortId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cohortId } = req.params;
    const { name, description, startDate, endDate, isActive, defaultTheme, cohortNumber } = req.body;

    // Get current cohort data
    const currentCohort = await (prisma as any).cohort.findUnique({
      where: { id: cohortId }
    });

    if (!currentCohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    const updateData: any = {};

    // Validate name + cohortNumber combination uniqueness
    const finalName = name !== undefined ? name : currentCohort.name;
    const finalCohortNumber = cohortNumber !== undefined ? parseInt(cohortNumber) : currentCohort.cohortNumber;

    // Check if the new name+number combination is unique (excluding current cohort)
    if (name !== undefined || cohortNumber !== undefined) {
      const existingCombination = await (prisma as any).cohort.findFirst({
        where: {
          name: finalName,
          cohortNumber: finalCohortNumber,
          id: { not: cohortId }
        }
      });

      if (existingCombination) {
        return res.status(400).json({ 
          message: `A cohort with name "${finalName}" and number ${finalCohortNumber} already exists` 
        });
      }
    }

    if (name !== undefined) updateData.name = name;
    if (cohortNumber !== undefined) updateData.cohortNumber = parseInt(cohortNumber);
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (defaultTheme !== undefined) updateData.defaultTheme = defaultTheme;

    const cohort = await (prisma as any).cohort.update({
      where: { id: cohortId },
      data: updateData,
      include: {
        _count: {
          select: {
            cohortMembers: {
              where: {
                isActive: true,
                user: {
                  isAdmin: false
                }
              }
            },
            modules: true,
            questions: true
          }
        }
      }
    });

    res.json({ cohort });
  } catch (error: any) {
    console.error('Error updating cohort:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Cohort not found' });
    }
    res.status(500).json({ message: 'Failed to update cohort' });
  }
});

// Get cohort members (admin only)
router.get('/:cohortId/members', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cohortId } = req.params;

    const members = await (prisma as any).cohortMember.findMany({
      where: { 
        cohortId,
        user: {
          isAdmin: false // Filter out admin users
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            trainName: true,
            isAdmin: true,
            createdAt: true
          }
        },
        cohort: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });

    res.json({ members });
  } catch (error) {
    console.error('Error fetching cohort members:', error);
    res.status(500).json({ message: 'Failed to fetch cohort members' });
  }
});

// Add user to cohort (admin only)
router.post('/:cohortId/members', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cohortId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user exists
    const user = await (prisma as any).user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if cohort exists
    const cohort = await (prisma as any).cohort.findUnique({
      where: { id: cohortId }
    });

    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    // Check if user is already in this cohort
    const existingMembership = await (prisma as any).cohortMember.findUnique({
      where: {
        userId_cohortId: {
          userId,
          cohortId
        }
      }
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        return res.status(400).json({ message: 'User is already a member of this cohort' });
      } else {
        // Reactivate existing membership
        const updatedMembership = await (prisma as any).cohortMember.update({
          where: { id: existingMembership.id },
          data: { 
            isActive: true,
            joinedAt: new Date() // Update join date
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                trainName: true,
                isAdmin: true
              }
            }
          }
        });

        return res.status(200).json({ member: updatedMembership });
      }
    }

    // Create new membership
    const membership = await (prisma as any).cohortMember.create({
      data: {
        userId,
        cohortId,
        currentStep: 0,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            trainName: true,
            isAdmin: true
          }
        }
      }
    });

    res.status(201).json({ member: membership });
  } catch (error) {
    console.error('Error adding user to cohort:', error);
    res.status(500).json({ message: 'Failed to add user to cohort' });
  }
});

// Remove user from cohort (admin only)
router.delete('/:cohortId/members/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cohortId, userId } = req.params;

    // Find the membership
    const membership = await (prisma as any).cohortMember.findUnique({
      where: {
        userId_cohortId: {
          userId,
          cohortId
        }
      }
    });

    if (!membership) {
      return res.status(404).json({ message: 'User is not a member of this cohort' });
    }

    // Deactivate instead of deleting to preserve data
    await (prisma as any).cohortMember.update({
      where: { id: membership.id },
      data: { isActive: false }
    });

    res.json({ message: 'User removed from cohort successfully' });
  } catch (error) {
    console.error('Error removing user from cohort:', error);
    res.status(500).json({ message: 'Failed to remove user from cohort' });
  }
});

// Get all users (for assignment purposes - admin only)
router.get('/users/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await (prisma as any).user.findMany({
      where: { isAdmin: false }, // Filter out admin users
      select: {
        id: true,
        email: true,
        fullName: true,
        trainName: true,
        isAdmin: true,
        createdAt: true,
        cohortMembers: {
          where: { isActive: true },
          include: {
            cohort: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          },
          orderBy: {
            joinedAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Copy cohort (admin only)
router.post('/:cohortId/copy', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cohortId } = req.params;
    const { newName, newCohortNumber } = req.body;

    if (!newName || newCohortNumber === undefined) {
      return res.status(400).json({ message: 'New name and cohort number are required' });
    }

    // Get the source cohort with all its content
    const sourceCohort = await (prisma as any).cohort.findUnique({
      where: { id: cohortId },
      include: {
        modules: {
          include: {
            questions: {
              include: {
                contents: {
                  include: {
                    miniQuestions: true
                  }
                }
              }
            }
          }
        },
        questions: {
          include: {
            contents: {
              include: {
                miniQuestions: true
              }
            }
          }
        }
      }
    });

    if (!sourceCohort) {
      return res.status(404).json({ message: 'Source cohort not found' });
    }

    // Check if the new name+number combination is unique
    const existingCombination = await (prisma as any).cohort.findFirst({
      where: {
        name: newName,
        cohortNumber: parseInt(newCohortNumber)
      }
    });

    if (existingCombination) {
      return res.status(400).json({ 
        message: `A cohort with name "${newName}" and number ${newCohortNumber} already exists` 
      });
    }

    // Start transaction to copy everything
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // 1. Create new cohort (with default dates that should be updated later)
      const newCohort = await tx.cohort.create({
        data: {
          name: newName,
          cohortNumber: parseInt(newCohortNumber),
          description: sourceCohort.description,
          startDate: new Date(), // Default to current date - should be updated manually
          endDate: null, // End date set to null - should be set manually
          isActive: false, // Start inactive for safety
          defaultTheme: sourceCohort.defaultTheme
        }
      });

      // 2. Copy modules with their questions and mini questions
      const moduleMapping: { [key: string]: string } = {};
      
      for (const sourceModule of sourceCohort.modules) {
        const newModule = await tx.module.create({
          data: {
            moduleNumber: sourceModule.moduleNumber,
            title: sourceModule.title,
            description: sourceModule.description,
            theme: sourceModule.theme,
            isActive: sourceModule.isActive,
            isReleased: false, // Reset release status for copied module
            // releaseDate excluded - will be set manually later
            cohortId: newCohort.id
          }
        });
        
        moduleMapping[sourceModule.id] = newModule.id;

        // Copy module questions
        for (const sourceQuestion of sourceModule.questions) {
          const newQuestion = await tx.question.create({
            data: {
              questionNumber: sourceQuestion.questionNumber,
              title: sourceQuestion.title,
              content: sourceQuestion.content,
              description: sourceQuestion.description,
              deadline: new Date('2099-12-31'), // Far future default - should be updated manually
              points: sourceQuestion.points,
              bonusPoints: sourceQuestion.bonusPoints,
              isActive: sourceQuestion.isActive,
              isReleased: false, // Reset release status for copied question
              // releaseDate excluded - will be set manually later
              moduleId: newModule.id,
              topicNumber: sourceQuestion.topicNumber,
              category: sourceQuestion.category,
              cohortId: newCohort.id
            }
          });

          // Copy question contents and their mini questions
          for (const sourceContent of sourceQuestion.contents) {
            const newContent = await tx.content.create({
              data: {
                title: sourceContent.title,
                material: sourceContent.material,
                orderIndex: sourceContent.orderIndex,
                isActive: sourceContent.isActive,
                questionId: newQuestion.id
              }
            });

            // Copy content mini questions (without dates and release status)
            for (const sourceMiniQuestion of sourceContent.miniQuestions) {
              await tx.miniQuestion.create({
                data: {
                  title: sourceMiniQuestion.title,
                  question: sourceMiniQuestion.question,
                  description: sourceMiniQuestion.description,
                  resourceUrl: sourceMiniQuestion.resourceUrl,
                  // releaseDate excluded - will be set manually later
                  isReleased: false, // Reset release status for copied mini question
                  // actualReleaseDate excluded - will be set when released
                  orderIndex: sourceMiniQuestion.orderIndex,
                  isActive: sourceMiniQuestion.isActive,
                  contentId: newContent.id
                }
              });
            }
          }
        }
      }

      // 3. Copy standalone questions (not associated with modules)
      for (const sourceQuestion of sourceCohort.questions.filter((q: any) => !q.moduleId)) {
        const newQuestion = await tx.question.create({
          data: {
            questionNumber: sourceQuestion.questionNumber,
            title: sourceQuestion.title,
            content: sourceQuestion.content,
            description: sourceQuestion.description,
            deadline: new Date('2099-12-31'), // Far future default - should be updated manually
            points: sourceQuestion.points,
            bonusPoints: sourceQuestion.bonusPoints,
            isActive: sourceQuestion.isActive,
            isReleased: false, // Reset release status for copied question
            // releaseDate excluded - will be set manually later
            moduleId: null,
            topicNumber: sourceQuestion.topicNumber,
            category: sourceQuestion.category,
            cohortId: newCohort.id
          }
        });

        // Copy question contents and their mini questions
        for (const sourceContent of sourceQuestion.contents) {
          const newContent = await tx.content.create({
            data: {
              title: sourceContent.title,
              material: sourceContent.material,
              orderIndex: sourceContent.orderIndex,
              isActive: sourceContent.isActive,
              questionId: newQuestion.id
            }
          });

          // Copy content mini questions (without dates and release status)
          for (const sourceMiniQuestion of sourceContent.miniQuestions) {
            await tx.miniQuestion.create({
              data: {
                title: sourceMiniQuestion.title,
                question: sourceMiniQuestion.question,
                description: sourceMiniQuestion.description,
                resourceUrl: sourceMiniQuestion.resourceUrl,
                // releaseDate excluded - will be set manually later
                isReleased: false, // Reset release status for copied mini question
                // actualReleaseDate excluded - will be set when released
                orderIndex: sourceMiniQuestion.orderIndex,
                isActive: sourceMiniQuestion.isActive,
                contentId: newContent.id
              }
            });
          }
        }
      }

      return newCohort;
    });

    // Return the new cohort with counts
    const newCohortWithCounts = await (prisma as any).cohort.findUnique({
      where: { id: result.id },
      include: {
        _count: {
          select: {
            cohortMembers: {
              where: {
                isActive: true,
                user: {
                  isAdmin: false
                }
              }
            },
            modules: true,
            questions: true
          }
        }
      }
    });

    res.json({ 
      message: 'Cohort copied successfully',
      cohort: newCohortWithCounts
    });
  } catch (error: any) {
    console.error('Error copying cohort:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to copy cohort', error: error.message });
  }
});

// Delete cohort (admin only)
router.delete('/:cohortId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cohortId } = req.params;

    // Check if cohort exists
    const cohort = await (prisma as any).cohort.findUnique({
      where: { id: cohortId },
      include: {
        _count: {
          select: {
            cohortMembers: true,
            modules: true,
            questions: true
          }
        }
      }
    });

    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    // Delete in transaction to ensure data integrity
    await (prisma as any).$transaction(async (tx: any) => {
      // Delete in reverse dependency order to avoid foreign key constraints
      
      // 1. Delete mini answers
      await tx.miniAnswer.deleteMany({
        where: { cohortId }
      });

      // 2. Delete answers
      await tx.answer.deleteMany({
        where: { cohortId }
      });

      // 3. Delete mini questions (through contents)
      const contents = await tx.content.findMany({
        where: {
          question: {
            cohortId
          }
        }
      });

      for (const content of contents) {
        await tx.miniQuestion.deleteMany({
          where: { contentId: content.id }
        });
      }

      // 4. Delete contents
      await tx.content.deleteMany({
        where: {
          question: {
            cohortId
          }
        }
      });

      // 5. Delete questions
      await tx.question.deleteMany({
        where: { cohortId }
      });

      // 6. Delete modules
      await tx.module.deleteMany({
        where: { cohortId }
      });

      // 7. Delete cohort members
      await tx.cohortMember.deleteMany({
        where: { cohortId }
      });

      // 8. Finally delete the cohort
      await tx.cohort.delete({
        where: { id: cohortId }
      });
    });

    res.json({ 
      message: 'Cohort deleted successfully',
      deletedCohort: {
        id: cohort.id,
        name: cohort.name,
        cohortNumber: cohort.cohortNumber,
        counts: cohort._count
      }
    });
  } catch (error: any) {
    console.error('Error deleting cohort:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to delete cohort', error: error.message });
  }
});

// Export cohort user data as Excel files (admin only)
router.get('/:cohortId/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cohortId } = req.params;
    console.log('Export request for cohort:', cohortId);

    // Get cohort info
    const cohort = await (prisma as any).cohort.findUnique({
      where: { id: cohortId },
      select: {
        id: true,
        name: true,
        cohortNumber: true,
        description: true,
        startDate: true,
        endDate: true
      }
    });

    console.log('Found cohort:', cohort);

    if (!cohort) {
      return res.status(404).json({ message: 'Cohort not found' });
    }

    // Get all cohort members with their data
    const members = await (prisma as any).cohortMember.findMany({
      where: { 
        cohortId,
        user: {
          isAdmin: false
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            trainName: true,
            createdAt: true,
            currentStep: true
          }
        }
      }
    });

    console.log('Found members:', members.length);

    // Get detailed user data for each member
    const userDataPromises = members.map(async (member: any) => {
      const userId = member.user.id;
      console.log('Processing user:', userId);

      try {
        // Get user's answers for this cohort
        const answers = await (prisma as any).answer.findMany({
          where: {
            userId,
            cohortId
          },
          include: {
            question: {
              select: {
                id: true,
                title: true,
                category: true,
                module: {
                  select: {
                    title: true
                  }
                }
              }
            }
          },
          orderBy: {
            submittedAt: 'asc'
          }
        });

        console.log(`Found ${answers.length} answers for user ${userId}`);

        // Get user's mini answers for this cohort
        const miniAnswers = await (prisma as any).miniAnswer.findMany({
          where: {
            userId,
            cohortId
          },
          include: {
            miniQuestion: {
              select: {
                id: true,
                question: true,
                title: true
              }
            }
          },
          orderBy: {
            submittedAt: 'asc'
          }
        });

        console.log(`Found ${miniAnswers.length} mini answers for user ${userId}`);

        return {
          user: member.user,
          membershipInfo: {
            joinedAt: member.joinedAt,
            status: member.status,
            isActive: member.isActive
          },
          answers,
          miniAnswers
        };
      } catch (userError: any) {
        console.error(`Error processing user ${userId}:`, userError);
        return {
          user: member.user,
          membershipInfo: {
            joinedAt: member.joinedAt,
            status: member.status,
            isActive: member.isActive
          },
          answers: [],
          miniAnswers: [],
          error: userError.message
        };
      }
    });

    const userData = await Promise.all(userDataPromises);
    console.log('Completed processing all users');

    res.json({
      cohort,
      userData
    });

  } catch (error: any) {
    console.error('Error exporting cohort data:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to export cohort data', error: error.message });
  }
});

export default router;
