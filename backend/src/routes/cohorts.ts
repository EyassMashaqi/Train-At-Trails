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
    const { name, description, startDate, endDate } = req.body;

    if (!name || !startDate) {
      return res.status(400).json({ message: 'Name and start date are required' });
    }

    // Check if cohort name already exists
    const existingCohort = await (prisma as any).cohort.findUnique({
      where: { name }
    });

    if (existingCohort) {
      return res.status(400).json({ message: 'Cohort name already exists' });
    }

    const cohort = await (prisma as any).cohort.create({
      data: {
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
    const { name, description, startDate, endDate, isActive } = req.body;

    const updateData: any = {};

    if (name !== undefined) {
      // Check if name is unique (excluding current cohort)
      const existingCohort = await (prisma as any).cohort.findFirst({
        where: {
          name,
          id: { not: cohortId }
        }
      });

      if (existingCohort) {
        return res.status(400).json({ message: 'Cohort name already exists' });
      }

      updateData.name = name;
    }

    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

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

export default router;
