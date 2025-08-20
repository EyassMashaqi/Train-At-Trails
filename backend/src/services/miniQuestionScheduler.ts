import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const startMiniQuestionScheduler = () => {
  console.log('🎯 Starting mini question release scheduler...');
  
  // Run every 30 minutes to check if mini questions should be released
  cron.schedule('*/30 * * * *', async () => {
    try {
      
      const now = new Date();
      
      // Find mini questions that should be released (release date <= now and not yet released)
      const miniQuestionsToRelease = await (prisma as any).miniQuestion.findMany({
        where: {
          releaseDate: {
            lte: now
          },
          isReleased: false,
          content: {
            question: {
              isReleased: true // Only release mini questions for released assignments
            }
          }
        },
        include: {
          content: {
            include: {
              question: true
            }
          }
        }
      });

      if (miniQuestionsToRelease.length > 0) {
        console.log(`📅 Releasing ${miniQuestionsToRelease.length} mini question(s)...`);
        
        // Release each mini question
        for (const miniQuestion of miniQuestionsToRelease) {
          await (prisma as any).miniQuestion.update({
            where: { id: miniQuestion.id },
            data: {
              isReleased: true,
              actualReleaseDate: new Date()
            }
          });
          
          console.log(`✅ Released mini question: "${miniQuestion.title}" for assignment "${miniQuestion.content.question.title}"`);
        }
      }

      // Find mini questions that should be hidden (release date > now and currently released)
      const miniQuestionsToHide = await (prisma as any).miniQuestion.findMany({
        where: {
          releaseDate: {
            gt: now
          },
          isReleased: true,
          content: {
            question: {
              isReleased: true // Only check mini questions for released assignments
            }
          }
        },
        include: {
          content: {
            include: {
              question: true
            }
          }
        }
      });

      if (miniQuestionsToHide.length > 0) {
        console.log(`🔒 Hiding ${miniQuestionsToHide.length} mini question(s) with future release dates...`);
        
        // Hide each mini question
        for (const miniQuestion of miniQuestionsToHide) {
          await (prisma as any).miniQuestion.update({
            where: { id: miniQuestion.id },
            data: {
              isReleased: false,
              actualReleaseDate: null
            }
          });
          
          console.log(`🔒 Hidden mini question: "${miniQuestion.title}" for assignment "${miniQuestion.content.question.title}" (release date moved to future)`);
        }
      }
      
    } catch (error) {
      console.error('❌ Mini question scheduler error:', error);
    }
  });

  console.log('✅ Mini question release scheduler started');
};

export const stopMiniQuestionScheduler = () => {
  console.log('🛑 Stopping mini question release scheduler...');
  // Note: node-cron doesn't provide a direct way to stop specific tasks
  // In a production environment, you might want to store task references
};
