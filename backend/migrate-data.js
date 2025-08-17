const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Helper function to safely parse dates
function parseDate(dateStr) {
  if (!dateStr || dateStr === '' || dateStr === 'NULL') return new Date();
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
}

// Helper function to clean undefined/null values
function cleanValue(value, defaultValue = null) {
  if (value === undefined || value === 'undefined' || value === null || value === 'NULL') {
    return defaultValue;
  }
  return value;
}

// Create two Prisma clients - one for each database
const postgresqlPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL // PostgreSQL connection
    }
  }
});

// SQLite connection
const sqliteDbPath = path.join(__dirname, './prisma/dev.db');
console.log('SQLite DB path:', sqliteDbPath);

async function migrateDataFromSQLiteToPostgreSQL() {
  console.log('🚀 Starting data migration from SQLite to PostgreSQL...\n');

  try {
    // Check if SQLite database exists
    const fs = require('fs');
    if (!fs.existsSync(sqliteDbPath)) {
      console.log('❌ SQLite database (dev.db) not found at:', sqliteDbPath);
      console.log('Please make sure the dev.db file exists in the prisma folder');
      return;
    }

    // Connect to SQLite database
    const sqlite = new sqlite3.Database(sqliteDbPath);

    // Helper function to run SQLite queries
    const runSQLiteQuery = (query, params = []) => {
      return new Promise((resolve, reject) => {
        sqlite.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    };

    console.log('📊 Checking data in SQLite database...');

    // Check what tables exist in SQLite
    const tables = await runSQLiteQuery(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations'
      ORDER BY name
    `);
    
    console.log('Tables found in SQLite:', tables.map(t => t.name));

    // 1. Migrate Users
    console.log('\n👥 Migrating Users...');
    const users = await runSQLiteQuery('SELECT * FROM users');
    console.log(`Found ${users.length} users in SQLite`);
    
    for (const user of users) {
      try {
        await postgresqlPrisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            password: user.password,
            fullName: user.fullName,
            trainName: user.trainName,
            isAdmin: Boolean(user.isAdmin),
            currentStep: user.currentStep,
            currentCohortId: cleanValue(user.currentCohortId),
            createdAt: parseDate(user.createdAt),
            updatedAt: parseDate(user.updatedAt),
            hasGraduated: Boolean(user.hasGraduated || false),
            graduationDate: user.graduationDate ? parseDate(user.graduationDate) : null,
            overallGrade: cleanValue(user.overallGrade),
            gameStartDate: user.gameStartDate ? parseDate(user.gameStartDate) : new Date()
          }
        });
        console.log(`✅ Migrated user: ${user.email}`);
      } catch (error) {
        console.log(`⚠️ User ${user.email} already exists or error:`, error.message);
      }
    }

    // 2. Migrate Cohorts
    console.log('\n🏫 Migrating Cohorts...');
    const cohorts = await runSQLiteQuery('SELECT * FROM cohorts');
    console.log(`Found ${cohorts.length} cohorts in SQLite`);
    
    for (const cohort of cohorts) {
      try {
        await postgresqlPrisma.cohort.create({
          data: {
            id: cohort.id,
            cohortNumber: cohort.cohortNumber,
            name: cohort.name,
            description: cleanValue(cohort.description, ''),
            startDate: parseDate(cohort.startDate),
            endDate: cohort.endDate ? parseDate(cohort.endDate) : null,
            isActive: Boolean(cohort.isActive),
            defaultTheme: cleanValue(cohort.defaultTheme, 'trains'),
            maxParticipants: cohort.maxParticipants || 50,
            trainName: cleanValue(cohort.trainName, 'Adventure Express'),
            createdAt: parseDate(cohort.createdAt),
            updatedAt: parseDate(cohort.updatedAt)
          }
        });
        console.log(`✅ Migrated cohort: ${cohort.name}`);
      } catch (error) {
        console.log(`⚠️ Cohort ${cohort.name} already exists or error:`, error.message);
      }
    }

    // 3. Migrate CohortMembers
    console.log('\n👨‍🎓 Migrating Cohort Members...');
    try {
      const cohortMembers = await runSQLiteQuery('SELECT * FROM cohort_members');
      console.log(`Found ${cohortMembers.length} cohort members in SQLite`);
      
      for (const member of cohortMembers) {
        try {
          await postgresqlPrisma.cohortMember.create({
            data: {
              id: member.id,
              userId: member.userId,
              cohortId: member.cohortId,
              status: cleanValue(member.status, 'ENROLLED'),
              isActive: Boolean(member.isActive),
              joinedAt: parseDate(member.joinedAt),
              leftAt: member.leftAt ? parseDate(member.leftAt) : null,
              createdAt: parseDate(member.createdAt),
              updatedAt: parseDate(member.updatedAt)
            }
          });
          console.log(`✅ Migrated cohort member: ${member.userId} -> ${member.cohortId}`);
        } catch (error) {
          console.log(`⚠️ Cohort member already exists or error:`, error.message);
        }
      }
    } catch (error) {
      console.log('⚠️ CohortMember table might not exist or be empty');
    }

    // 4. Migrate Modules
    console.log('\n📚 Migrating Modules...');
    try {
      const modules = await runSQLiteQuery('SELECT * FROM modules');
      console.log(`Found ${modules.length} modules in SQLite`);
      
      for (const module of modules) {
        try {
          await postgresqlPrisma.module.create({
            data: {
              id: module.id,
              moduleNumber: module.moduleNumber,
              title: module.title,
              description: cleanValue(module.description, ''),
              theme: cleanValue(module.theme, 'adventure'),
              isActive: Boolean(module.isActive),
              isReleased: Boolean(module.isReleased),
              releaseDate: module.releaseDate ? parseDate(module.releaseDate) : null,
              createdAt: parseDate(module.createdAt),
              updatedAt: parseDate(module.updatedAt),
              cohortId: cleanValue(module.cohortId)
            }
          });
          console.log(`✅ Migrated module: ${module.title}`);
        } catch (error) {
          console.log(`⚠️ Module ${module.title} already exists or error:`, error.message);
        }
      }
    } catch (error) {
      console.log('⚠️ Module table might not exist or be empty');
    }

    // 5. Migrate Questions
    console.log('\n❓ Migrating Questions...');
    try {
      const questions = await runSQLiteQuery('SELECT * FROM questions');
      console.log(`Found ${questions.length} questions in SQLite`);
      
      for (const question of questions) {
        try {
          await postgresqlPrisma.question.create({
            data: {
              id: question.id,
              questionNumber: question.questionNumber,
              title: question.title,
              content: cleanValue(question.content, ''),
              description: cleanValue(question.description, ''),
              deadline: parseDate(question.deadline),
              points: question.points || 100,
              bonusPoints: question.bonusPoints || 50,
              isActive: Boolean(question.isActive),
              isReleased: Boolean(question.isReleased),
              releaseDate: question.releaseDate ? parseDate(question.releaseDate) : null,
              releasedAt: question.releasedAt ? parseDate(question.releasedAt) : null,
              moduleId: cleanValue(question.moduleId),
              topicNumber: question.topicNumber,
              category: cleanValue(question.category),
              createdAt: parseDate(question.createdAt),
              updatedAt: parseDate(question.updatedAt),
              cohortId: cleanValue(question.cohortId)
            }
          });
          console.log(`✅ Migrated question: ${question.title}`);
        } catch (error) {
          console.log(`⚠️ Question ${question.title} already exists or error:`, error.message);
        }
      }
    } catch (error) {
      console.log('⚠️ Question table might not exist or be empty');
    }

    // 6. Migrate Answers
    console.log('\n📝 Migrating Answers...');
    try {
      const answers = await runSQLiteQuery('SELECT * FROM answers');
      console.log(`Found ${answers.length} answers in SQLite`);
      
      for (const answer of answers) {
        try {
          await postgresqlPrisma.answer.create({
            data: {
              id: answer.id,
              content: cleanValue(answer.content, ''),
              notes: cleanValue(answer.notes),
              status: cleanValue(answer.status, 'PENDING'),
              attachmentUrl: cleanValue(answer.attachmentUrl),
              attachmentName: cleanValue(answer.attachmentName),
              grade: answer.grade,
              adminNotes: cleanValue(answer.adminNotes),
              submittedAt: parseDate(answer.submittedAt),
              reviewedAt: answer.reviewedAt ? parseDate(answer.reviewedAt) : null,
              resubmissionRequested: Boolean(answer.resubmissionRequested),
              resubmissionReason: cleanValue(answer.resubmissionReason),
              resubmissionRequestedAt: answer.resubmissionRequestedAt ? parseDate(answer.resubmissionRequestedAt) : null,
              createdAt: parseDate(answer.createdAt),
              updatedAt: parseDate(answer.updatedAt),
              userId: answer.userId,
              questionId: answer.questionId
            }
          });
          console.log(`✅ Migrated answer for question ${answer.questionId}`);
        } catch (error) {
          console.log(`⚠️ Answer already exists or error:`, error.message);
        }
      }
    } catch (error) {
      console.log('⚠️ Answer table might not exist or be empty');
    }

    // 7. Migrate Content
    console.log('\n📄 Migrating Content...');
    try {
      const contents = await runSQLiteQuery('SELECT * FROM contents');
      console.log(`Found ${contents.length} content items in SQLite`);
      
      for (const content of contents) {
        try {
          await postgresqlPrisma.content.create({
            data: {
              id: content.id,
              title: content.title,
              material: cleanValue(content.material, ''),
              orderIndex: content.orderIndex,
              isActive: Boolean(content.isActive),
              createdAt: parseDate(content.createdAt),
              updatedAt: parseDate(content.updatedAt),
              questionId: content.questionId
            }
          });
          console.log(`✅ Migrated content: ${content.title}`);
        } catch (error) {
          console.log(`⚠️ Content ${content.title} already exists or error:`, error.message);
        }
      }
    } catch (error) {
      console.log('⚠️ Content table might not exist or be empty');
    }

    // 8. Migrate MiniQuestions
    console.log('\n🔍 Migrating Mini Questions...');
    try {
      const miniQuestions = await runSQLiteQuery('SELECT * FROM mini_questions');
      console.log(`Found ${miniQuestions.length} mini questions in SQLite`);
      
      for (const miniQuestion of miniQuestions) {
        try {
          await postgresqlPrisma.miniQuestion.create({
            data: {
              id: miniQuestion.id,
              title: miniQuestion.title,
              question: cleanValue(miniQuestion.question, ''),
              description: cleanValue(miniQuestion.description, ''),
              resourceUrl: cleanValue(miniQuestion.resourceUrl),
              releaseDate: miniQuestion.releaseDate ? parseDate(miniQuestion.releaseDate) : null,
              isReleased: Boolean(miniQuestion.isReleased),
              actualReleaseDate: miniQuestion.actualReleaseDate ? parseDate(miniQuestion.actualReleaseDate) : null,
              orderIndex: miniQuestion.orderIndex,
              isActive: Boolean(miniQuestion.isActive),
              createdAt: parseDate(miniQuestion.createdAt),
              updatedAt: parseDate(miniQuestion.updatedAt),
              contentId: miniQuestion.contentId
            }
          });
          console.log(`✅ Migrated mini question: ${miniQuestion.title}`);
        } catch (error) {
          console.log(`⚠️ Mini question ${miniQuestion.title} already exists or error:`, error.message);
        }
      }
    } catch (error) {
      console.log('⚠️ MiniQuestion table might not exist or be empty');
    }

    // 9. Migrate MiniAnswers
    console.log('\n📋 Migrating Mini Answers...');
    try {
      const miniAnswers = await runSQLiteQuery('SELECT * FROM mini_answers');
      console.log(`Found ${miniAnswers.length} mini answers in SQLite`);
      
      for (const miniAnswer of miniAnswers) {
        try {
          await postgresqlPrisma.miniAnswer.create({
            data: {
              id: miniAnswer.id,
              linkUrl: cleanValue(miniAnswer.linkUrl),
              notes: cleanValue(miniAnswer.notes),
              status: cleanValue(miniAnswer.status, 'SUBMITTED'),
              createdAt: parseDate(miniAnswer.createdAt),
              updatedAt: parseDate(miniAnswer.updatedAt),
              userId: miniAnswer.userId,
              miniQuestionId: miniAnswer.miniQuestionId
            }
          });
          console.log(`✅ Migrated mini answer for question ${miniAnswer.miniQuestionId}`);
        } catch (error) {
          console.log(`⚠️ Mini answer already exists or error:`, error.message);
        }
      }
    } catch (error) {
      console.log('⚠️ MiniAnswer table might not exist or be empty');
    }

    // 10. Migrate GameConfig (if exists)
    console.log('\n⚙️ Migrating Game Config...');
    try {
      const gameConfigs = await runSQLiteQuery('SELECT * FROM game_config');
      console.log(`Found ${gameConfigs.length} game config items in SQLite`);
      
      for (const config of gameConfigs) {
        try {
          await postgresqlPrisma.gameConfig.create({
            data: {
              id: config.id,
              key: cleanValue(config.key, ''),
              value: cleanValue(config.value, ''),
              description: cleanValue(config.description, ''),
              createdAt: parseDate(config.createdAt),
              updatedAt: parseDate(config.updatedAt)
            }
          });
          console.log(`✅ Migrated game config: ${config.key}`);
        } catch (error) {
          console.log(`⚠️ Game config ${config.key} already exists or error:`, error.message);
        }
      }
    } catch (error) {
      console.log('⚠️ GameConfig table might not exist or be empty');
    }

    // Close SQLite connection
    sqlite.close();

    console.log('\n🎉 Data migration completed successfully!');
    console.log('\n📊 Summary:');
    
    // Count migrated records
    const counts = await Promise.all([
      postgresqlPrisma.user.count(),
      postgresqlPrisma.cohort.count(),
      postgresqlPrisma.cohortMember.count(),
      postgresqlPrisma.module.count(),
      postgresqlPrisma.question.count(),
      postgresqlPrisma.answer.count(),
      postgresqlPrisma.content.count(),
      postgresqlPrisma.miniQuestion.count(),
      postgresqlPrisma.miniAnswer.count(),
      postgresqlPrisma.gameConfig.count()
    ]);

    console.log(`   Users: ${counts[0]}`);
    console.log(`   Cohorts: ${counts[1]}`);
    console.log(`   Cohort Members: ${counts[2]}`);
    console.log(`   Modules: ${counts[3]}`);
    console.log(`   Questions: ${counts[4]}`);
    console.log(`   Answers: ${counts[5]}`);
    console.log(`   Content: ${counts[6]}`);
    console.log(`   Mini Questions: ${counts[7]}`);
    console.log(`   Mini Answers: ${counts[8]}`);
    console.log(`   Game Config: ${counts[9]}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await postgresqlPrisma.$disconnect();
  }
}

migrateDataFromSQLiteToPostgreSQL();
