import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const startQuestionScheduler = () => {
  console.log('🕒 Starting question release scheduler...');
  
  // Run every hour to check if new questions should be released
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🔍 Checking for questions to release...');
      
      // Get game config
      const config = await prisma.gameConfig.findUnique({
        where: { id: 'singleton' }
      });

      if (!config) {
        console.log('⚠️ Game configuration not found');
        return;
      }

      // Get the latest released question
      const latestQuestion = await prisma.question.findFirst({
        where: { isActive: true },
        orderBy: { questionNumber: 'desc' }
      });

      // Calculate when the next question should be released
      let nextReleaseTime: Date;
      
      if (latestQuestion && latestQuestion.releaseDate) {
        nextReleaseTime = new Date(
          latestQuestion.releaseDate.getTime() + 
          (config.questionReleaseIntervalHours * 60 * 60 * 1000)
        );
      } else {
        // First question should be released based on game start date
        nextReleaseTime = new Date(
          config.gameStartDate.getTime() + 
          (config.questionReleaseIntervalHours * 60 * 60 * 1000)
        );
      }

      // Check if it's time to release the next question
      const now = new Date();
      if (now >= nextReleaseTime) {
        // Find the next question to release
        const nextQuestionNumber = latestQuestion ? latestQuestion.questionNumber + 1 : 1;
        
        if (nextQuestionNumber <= config.totalQuestions) {
          const questionToRelease = await prisma.question.findUnique({
            where: { questionNumber: nextQuestionNumber }
          });

          if (questionToRelease && !questionToRelease.isActive) {
            // Release the question
            await prisma.question.update({
              where: { id: questionToRelease.id },
              data: {
                isActive: true,
                releaseDate: now
              }
            });

            console.log(`🎯 Released question ${nextQuestionNumber}: ${questionToRelease.title}`);
          } else if (!questionToRelease) {
            console.log(`⚠️ Question ${nextQuestionNumber} not found in database`);
          } else {
            console.log(`ℹ️ Question ${nextQuestionNumber} is already active`);
          }
        } else {
          console.log('🏁 All questions have been released');
        }
      } else {
        const hoursUntilNext = (nextReleaseTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        console.log(`⏰ Next question release in ${hoursUntilNext.toFixed(1)} hours`);
      }
    } catch (error) {
      console.error('❌ Error in question scheduler:', error);
    }
  });

  console.log('✅ Question release scheduler started');
};

// Helper function to manually release a question (for testing)
export const releaseQuestion = async (questionNumber: number) => {
  try {
    const question = await prisma.question.findUnique({
      where: { questionNumber }
    });

    if (!question) {
      throw new Error(`Question ${questionNumber} not found`);
    }

    if (question.isActive) {
      console.log(`Question ${questionNumber} is already active`);
      return question;
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: question.id },
      data: {
        isActive: true,
        releaseDate: new Date()
      }
    });

    console.log(`✅ Manually released question ${questionNumber}`);
    return updatedQuestion;
  } catch (error) {
    console.error('❌ Error releasing question:', error);
    throw error;
  }
};
