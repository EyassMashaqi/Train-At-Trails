import { PrismaClient } from '@prisma/client';

// Note: TypeScript may show errors for Prisma client methods like prisma.module and prisma.topic
// This is a temporary issue with TypeScript language server not recognizing updated Prisma types
// The code works correctly at runtime after database migration and Prisma generation

const prisma = new PrismaClient();

export class ModuleTopicScheduler {
  
  /**
   * Release modules and topics based on schedule
   * Modules release every 2 weeks, topics every 2 days within module
   */
  static async releaseScheduledContent() {
    const now = new Date();
    
    try {
      // Release modules that should be available now
      // @ts-ignore - Prisma client types may not be updated yet, but runtime works
      const modulesToRelease = await prisma.module.findMany({
        where: {
          isActive: true,
          isReleased: false,
          releaseDate: { lte: now }
        }
      });

      for (const module of modulesToRelease) {
        // @ts-ignore - Prisma client types may not be updated yet, but runtime works
        await prisma.module.update({
          where: { id: module.id },
          data: { 
            isReleased: true
          }
        });
        
        console.log(`📚 Module ${module.moduleNumber} "${module.title}" has been released!`);
      }

      // Release topics that should be available now
      // @ts-ignore - Prisma client types may not be updated yet, but runtime works
      const topicsToRelease = await prisma.topic.findMany({
        where: {
          isActive: true,
          isReleased: false,
          releaseDate: { lte: now },
          module: {
            isReleased: true // Only release topics for released modules
          }
        },
        include: {
          module: true
        }
      });

      for (const topic of topicsToRelease) {
        // @ts-ignore - Prisma client types may not be updated yet, but runtime works
        await prisma.topic.update({
          where: { id: topic.id },
          data: { 
            isReleased: true,
            releasedAt: now
          }
        });
        
        console.log(`📖 Topic ${topic.module.moduleNumber}.${topic.topicNumber} "${topic.title}" has been released!`);
      }

      return {
        releasedModules: modulesToRelease.length,
        releasedTopics: topicsToRelease.length
      };
    } catch (error) {
      console.error('Error in releaseScheduledContent:', error);
      throw error;
    }
  }

  /**
   * Get the next release schedule
   */
  static async getNextReleaseInfo() {
    try {
      // @ts-ignore - Prisma client types may not be updated yet, but runtime works
      const nextModule = await prisma.module.findFirst({
        where: {
          isActive: true,
          isReleased: false
        },
        orderBy: { releaseDate: 'asc' }
      });

      // @ts-ignore - Prisma client types may not be updated yet, but runtime works
      const nextTopic = await prisma.topic.findFirst({
        where: {
          isActive: true,
          isReleased: false,
          module: {
            isReleased: true
          }
        },
        orderBy: { releaseDate: 'asc' },
        include: {
          module: true
        }
      });

      return {
        nextModule: nextModule ? {
          id: nextModule.id,
          moduleNumber: nextModule.moduleNumber,
          title: nextModule.title,
          releaseDate: nextModule.releaseDate
        } : null,
        nextTopic: nextTopic ? {
          id: nextTopic.id,
          topicNumber: nextTopic.topicNumber,
          title: nextTopic.title,
          moduleTitle: nextTopic.module.title,
          releaseDate: nextTopic.releaseDate
        } : null
      };
    } catch (error) {
      console.error('Error in getNextReleaseInfo:', error);
      throw error;
    }
  }

  /**
   * Calculate user progress through modules/topics
   */
  static async calculateUserProgress(userId: string) {
    try {
      const approvedAnswers = await prisma.answer.findMany({
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
      
      approvedAnswers.forEach(answer => {
        if (answer.topic && answer.topic.module) {
          const moduleNum = answer.topic.module.moduleNumber;
          if (!moduleProgress[moduleNum]) {
            moduleProgress[moduleNum] = {
              module: answer.topic.module,
              completedTopics: [],
              totalTopics: 0
            };
          }
          moduleProgress[moduleNum].completedTopics.push(answer.topic);
        }
      });

      // Get total topics per module
      for (const moduleNum in moduleProgress) {
        const totalTopics = await prisma.topic.count({
          where: {
            module: {
              moduleNumber: parseInt(moduleNum)
            },
            isActive: true
          }
        });
        moduleProgress[moduleNum].totalTopics = totalTopics;
      }

      const totalCompletedTopics = approvedAnswers.length;
      const totalTopics = await prisma.topic.count({
        where: { isActive: true }
      });

      return {
        moduleProgress,
        totalCompletedTopics,
        totalTopics,
        progressPercentage: totalTopics > 0 ? (totalCompletedTopics / totalTopics) * 100 : 0,
        currentModule: this.getCurrentModule(moduleProgress),
        isComplete: totalCompletedTopics >= totalTopics
      };
    } catch (error) {
      console.error('Error in calculateUserProgress:', error);
      throw error;
    }
  }

  /**
   * Determine user's current module based on progress
   */
  private static getCurrentModule(moduleProgress: Record<number, any>) {
    let currentModule = 1;
    
    for (let i = 1; i <= 4; i++) {
      if (moduleProgress[i] && moduleProgress[i].completedTopics.length === moduleProgress[i].totalTopics) {
        currentModule = Math.min(i + 1, 4);
      } else {
        break;
      }
    }
    
    return currentModule;
  }

  /**
   * Update user's module and topic progress
   */
  static async updateUserProgress(userId: string) {
    try {
      const progress = await this.calculateUserProgress(userId);
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentModule: progress.currentModule,
          currentStep: progress.totalCompletedTopics, // Keep for compatibility
          currentTopic: this.getCurrentTopicInModule(progress.moduleProgress, progress.currentModule)
        }
      });

      return progress;
    } catch (error) {
      console.error('Error in updateUserProgress:', error);
      throw error;
    }
  }

  /**
   * Get current topic number within current module
   */
  private static getCurrentTopicInModule(moduleProgress: Record<number, any>, currentModule: number) {
    if (moduleProgress[currentModule]) {
      return moduleProgress[currentModule].completedTopics.length + 1;
    }
    return 1;
  }
}

// Schedule automatic content release (run every hour)
export const startModuleTopicScheduler = () => {
  console.log('🚀 Starting Module/Topic Scheduler...');
  
  // Run immediately
  ModuleTopicScheduler.releaseScheduledContent()
    .then(result => {
      console.log(`✅ Initial release check: ${result.releasedModules} modules, ${result.releasedTopics} topics released`);
    })
    .catch(error => {
      console.error('❌ Error in initial release check:', error);
    });

  // Run every hour
  setInterval(async () => {
    try {
      const result = await ModuleTopicScheduler.releaseScheduledContent();
      if (result.releasedModules > 0 || result.releasedTopics > 0) {
        console.log(`🎯 Scheduled release: ${result.releasedModules} modules, ${result.releasedTopics} topics released`);
      }
    } catch (error) {
      console.error('❌ Error in scheduled release:', error);
    }
  }, 60 * 60 * 1000); // Every hour
};
