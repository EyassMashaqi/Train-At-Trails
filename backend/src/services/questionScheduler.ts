import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import emailService from './emailService';
import { getPalestineTime } from '../utils/timezone';

const prisma = new PrismaClient();

export const startQuestionScheduler = () => {
  console.log('🕒 Starting question release scheduler...');
  
  // Run every hour to check if new questions should be released
  cron.schedule('0 * * * *', async () => {
    try {
      // Get default cohort
      const defaultCohort = await prisma.cohort.findFirst({
        where: { name: 'Default Cohort' }
      });

      if (!defaultCohort) {
        console.log('⚠️ Default cohort not found');
        return;
      }

      // Get game config for this cohort
      const config = await prisma.cohortGameConfig.findFirst({
        where: { cohortId: defaultCohort.id }
      });

      if (!config) {
        console.log('⚠️ Game configuration not found for default cohort');
        return;
      }

      // Get the latest released question for this cohort
      const latestQuestion = await prisma.question.findFirst({
        where: { 
          isActive: true,
          cohortId: defaultCohort.id
        },
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
      const now = getPalestineTime();
      if (now >= nextReleaseTime) {
        // Find the next question to release
        const nextQuestionNumber = latestQuestion ? latestQuestion.questionNumber + 1 : 1;
        
        if (nextQuestionNumber <= config.totalQuestions) {
          const questionToRelease = await prisma.question.findFirst({
            where: { 
              questionNumber: nextQuestionNumber,
              cohortId: defaultCohort.id
            }
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

            // Send email notifications to all cohort users
            try {
              // Get all enrolled users in the cohort
              const cohortUsers = await prisma.cohortMember.findMany({
                where: {
                  cohortId: defaultCohort.id,
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
                    questionToRelease.title,
                    questionToRelease.questionNumber
                  );
                } catch (emailError) {
                  console.error(`❌ Failed to send new question email to ${member.user.email}:`, emailError);
                }
              }
              
              console.log(`📧 Sent new question notifications to ${cohortUsers.length} users in cohort for Question ${nextQuestionNumber}`);
            } catch (emailError) {
              console.error('❌ Failed to send new question emails:', emailError);
            }
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
    // Get default cohort
    const defaultCohort = await prisma.cohort.findFirst({
      where: { name: 'Default Cohort' }
    });

    if (!defaultCohort) {
      throw new Error('Default cohort not found');
    }

    const question = await prisma.question.findFirst({
      where: { 
        questionNumber,
        cohortId: defaultCohort.id
      }
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
        releaseDate: getPalestineTime()
      }
    });

    console.log(`✅ Manually released question ${questionNumber}`);
    return updatedQuestion;
  } catch (error) {
    console.error('❌ Error releasing question:', error);
    throw error;
  }
};
