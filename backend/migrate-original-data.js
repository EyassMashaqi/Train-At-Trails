const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');
const path = require('path');

const prisma = new PrismaClient();

async function migrateOriginalData() {
  try {
    console.log('🔄 Starting data migration from original database...');
    
    // Connect to the original database
    const originalDbPath = path.join(__dirname, '../../dev.db');
    const originalDb = new Database(originalDbPath, { readonly: true });
    
    console.log('📂 Connected to original database');
    
    // Get all tables from original database
    const tables = originalDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    console.log('📋 Found tables:', tables.map(t => t.name));
    
    // Extract users (preserve existing and add new ones)
    console.log('\n👥 Migrating Users...');
    const originalUsers = originalDb.prepare("SELECT * FROM User").all();
    console.log(`Found ${originalUsers.length} users in original database`);
    
    for (const user of originalUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email }
      });
      
      if (!existingUser) {
        await prisma.user.create({
          data: {
            email: user.email,
            password: user.password,
            name: user.name,
            trainName: user.trainName,
            isAdmin: Boolean(user.isAdmin),
            currentStep: user.currentStep || 0,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt)
          }
        });
        console.log(`✅ Created user: ${user.email}`);
      } else {
        console.log(`⏭️  User already exists: ${user.email}`);
      }
    }
    
    // Extract cohorts
    console.log('\n🏢 Migrating Cohorts...');
    const originalCohorts = originalDb.prepare("SELECT * FROM Cohort").all();
    console.log(`Found ${originalCohorts.length} cohorts in original database`);
    
    for (const cohort of originalCohorts) {
      const existingCohort = await prisma.cohort.findUnique({
        where: { id: cohort.id }
      });
      
      if (!existingCohort) {
        await prisma.cohort.create({
          data: {
            id: cohort.id,
            name: cohort.name,
            description: cohort.description,
            isActive: Boolean(cohort.isActive),
            createdAt: new Date(cohort.createdAt),
            updatedAt: new Date(cohort.updatedAt)
          }
        });
        console.log(`✅ Created cohort: ${cohort.name}`);
      }
    }
    
    // Extract modules
    console.log('\n📚 Migrating Modules...');
    const originalModules = originalDb.prepare("SELECT * FROM Module").all();
    console.log(`Found ${originalModules.length} modules in original database`);
    
    for (const module of originalModules) {
      const existingModule = await prisma.module.findUnique({
        where: { id: module.id }
      });
      
      if (!existingModule) {
        await prisma.module.create({
          data: {
            id: module.id,
            moduleNumber: module.moduleNumber,
            title: module.title,
            description: module.description,
            isActive: Boolean(module.isActive),
            isReleased: Boolean(module.isReleased),
            releasedAt: module.releasedAt ? new Date(module.releasedAt) : null,
            cohortId: module.cohortId,
            createdAt: new Date(module.createdAt),
            updatedAt: new Date(module.updatedAt)
          }
        });
        console.log(`✅ Created module: ${module.title}`);
      }
    }
    
    // Extract questions
    console.log('\n❓ Migrating Questions...');
    const originalQuestions = originalDb.prepare("SELECT * FROM Question").all();
    console.log(`Found ${originalQuestions.length} questions in original database`);
    
    for (const question of originalQuestions) {
      const existingQuestion = await prisma.question.findUnique({
        where: { id: question.id }
      });
      
      if (!existingQuestion) {
        await prisma.question.create({
          data: {
            id: question.id,
            questionNumber: question.questionNumber,
            title: question.title,
            content: question.content,
            isReleased: Boolean(question.isReleased),
            releasedAt: question.releasedAt ? new Date(question.releasedAt) : null,
            moduleId: question.moduleId,
            cohortId: question.cohortId,
            createdAt: new Date(question.createdAt),
            updatedAt: new Date(question.updatedAt)
          }
        });
        console.log(`✅ Created question: ${question.title}`);
      }
    }
    
    // Extract answers
    console.log('\n📝 Migrating Answers...');
    const originalAnswers = originalDb.prepare("SELECT * FROM Answer").all();
    console.log(`Found ${originalAnswers.length} answers in original database`);
    
    for (const answer of originalAnswers) {
      const existingAnswer = await prisma.answer.findUnique({
        where: { id: answer.id }
      });
      
      if (!existingAnswer) {
        await prisma.answer.create({
          data: {
            id: answer.id,
            content: answer.content,
            linkUrl: answer.linkUrl || null,
            notes: answer.notes || null,
            status: answer.status,
            feedback: answer.feedback,
            submittedAt: new Date(answer.submittedAt),
            reviewedAt: answer.reviewedAt ? new Date(answer.reviewedAt) : null,
            userId: answer.userId,
            questionId: answer.questionId,
            // New grading fields will be null initially
            grade: null,
            gradePoints: null,
            resubmissionRequested: false,
            resubmissionApproved: false,
            resubmissionRequestedAt: null
          }
        });
        console.log(`✅ Created answer for user ${answer.userId}`);
      }
    }
    
    // Extract mini questions if they exist
    try {
      console.log('\n🔍 Migrating Mini Questions...');
      const originalMiniQuestions = originalDb.prepare("SELECT * FROM MiniQuestion").all();
      console.log(`Found ${originalMiniQuestions.length} mini questions in original database`);
      
      for (const miniQ of originalMiniQuestions) {
        const existingMiniQ = await prisma.miniQuestion.findUnique({
          where: { id: miniQ.id }
        });
        
        if (!existingMiniQ) {
          await prisma.miniQuestion.create({
            data: {
              id: miniQ.id,
              title: miniQ.title,
              content: miniQ.content,
              isReleased: Boolean(miniQ.isReleased),
              releasedAt: miniQ.releasedAt ? new Date(miniQ.releasedAt) : null,
              questionId: miniQ.questionId,
              cohortId: miniQ.cohortId,
              createdAt: new Date(miniQ.createdAt),
              updatedAt: new Date(miniQ.updatedAt)
            }
          });
          console.log(`✅ Created mini question: ${miniQ.title}`);
        }
      }
      
      // Extract mini answers
      console.log('\n📋 Migrating Mini Answers...');
      const originalMiniAnswers = originalDb.prepare("SELECT * FROM MiniAnswer").all();
      console.log(`Found ${originalMiniAnswers.length} mini answers in original database`);
      
      for (const miniA of originalMiniAnswers) {
        const existingMiniA = await prisma.miniAnswer.findUnique({
          where: { id: miniA.id }
        });
        
        if (!existingMiniA) {
          await prisma.miniAnswer.create({
            data: {
              id: miniA.id,
              linkUrl: miniA.linkUrl,
              notes: miniA.notes,
              status: miniA.status,
              feedback: miniA.feedback,
              submittedAt: new Date(miniA.submittedAt),
              reviewedAt: miniA.reviewedAt ? new Date(miniA.reviewedAt) : null,
              userId: miniA.userId,
              miniQuestionId: miniA.miniQuestionId
            }
          });
          console.log(`✅ Created mini answer for user ${miniA.userId}`);
        }
      }
    } catch (error) {
      console.log('ℹ️  Mini questions/answers table not found in original database (this is normal for older versions)');
    }
    
    // Extract user cohort assignments
    try {
      console.log('\n👤 Migrating User Cohort Assignments...');
      const originalAssignments = originalDb.prepare("SELECT * FROM UserCohort").all();
      console.log(`Found ${originalAssignments.length} user cohort assignments`);
      
      for (const assignment of originalAssignments) {
        const existingAssignment = await prisma.userCohort.findUnique({
          where: {
            userId_cohortId: {
              userId: assignment.userId,
              cohortId: assignment.cohortId
            }
          }
        });
        
        if (!existingAssignment) {
          await prisma.userCohort.create({
            data: {
              userId: assignment.userId,
              cohortId: assignment.cohortId,
              assignedAt: new Date(assignment.assignedAt)
            }
          });
          console.log(`✅ Assigned user ${assignment.userId} to cohort ${assignment.cohortId}`);
        }
      }
    } catch (error) {
      console.log('ℹ️  UserCohort table not found in original database');
    }
    
    originalDb.close();
    
    console.log('\n✅ Data migration completed successfully!');
    console.log('🎯 Your original data has been restored with the new grading system features!');
    
    // Show final counts
    const userCount = await prisma.user.count();
    const cohortCount = await prisma.cohort.count();
    const moduleCount = await prisma.module.count();
    const questionCount = await prisma.question.count();
    const answerCount = await prisma.answer.count();
    const miniQuestionCount = await prisma.miniQuestion.count();
    const miniAnswerCount = await prisma.miniAnswer.count();
    
    console.log('\n📊 Final Database Summary:');
    console.log(`👥 Users: ${userCount}`);
    console.log(`🏢 Cohorts: ${cohortCount}`);
    console.log(`📚 Modules: ${moduleCount}`);
    console.log(`❓ Questions: ${questionCount}`);
    console.log(`📝 Answers: ${answerCount}`);
    console.log(`🔍 Mini Questions: ${miniQuestionCount}`);
    console.log(`📋 Mini Answers: ${miniAnswerCount}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Install better-sqlite3 if not available
async function installDependency() {
  const { exec } = require('child_process');
  return new Promise((resolve, reject) => {
    exec('npm install better-sqlite3', (error, stdout, stderr) => {
      if (error) {
        console.log('⚠️  Installing better-sqlite3...');
        reject(error);
      } else {
        console.log('✅ better-sqlite3 installed');
        resolve();
      }
    });
  });
}

async function main() {
  try {
    await installDependency();
  } catch (error) {
    console.log('ℹ️  Proceeding without installing better-sqlite3 (may already be installed)');
  }
  
  await migrateOriginalData();
}

main().catch(console.error);
