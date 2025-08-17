const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Helper functions
function parseDate(dateStr) {
  if (!dateStr || dateStr === '' || dateStr === 'NULL') return new Date();
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
}

function cleanValue(value, defaultValue = null) {
  if (value === undefined || value === 'undefined' || value === null || value === 'NULL') {
    return defaultValue;
  }
  return value;
}

const postgresqlPrisma = new PrismaClient();
const sqliteDbPath = path.join(__dirname, './prisma/dev.db');

async function migrateFinalData() {
  console.log('🚀 Starting final data migration...\n');

  try {
    const sqliteDb = new sqlite3.Database(sqliteDbPath);

    function runSQLiteQuery(query, params = []) {
      return new Promise((resolve, reject) => {
        sqliteDb.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }

    // 1. Migrate Contents
    console.log('📄 Migrating Contents...');
    try {
      const contents = await runSQLiteQuery('SELECT * FROM contents');
      console.log(`Found ${contents.length} content items in SQLite`);
      
      let contentCount = 0;
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
          contentCount++;
        } catch (error) {
          console.log(`⚠️ Content ${content.title} error:`, error.message);
        }
      }
      console.log(`✅ Contents migrated: ${contentCount}/${contents.length}`);
    } catch (error) {
      console.log('⚠️ Content table error:', error.message);
    }

    // 2. Migrate Mini Questions
    console.log('\n❓ Migrating Mini Questions...');
    try {
      const miniQuestions = await runSQLiteQuery('SELECT * FROM mini_questions');
      console.log(`Found ${miniQuestions.length} mini questions in SQLite`);
      
      let miniQuestionCount = 0;
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
          miniQuestionCount++;
        } catch (error) {
          console.log(`⚠️ Mini question ${miniQuestion.title} error:`, error.message);
        }
      }
      console.log(`✅ Mini questions migrated: ${miniQuestionCount}/${miniQuestions.length}`);
    } catch (error) {
      console.log('⚠️ Mini question table error:', error.message);
    }

    // 3. Migrate Answers
    console.log('\n📝 Migrating Answers...');
    try {
      const answers = await runSQLiteQuery('SELECT * FROM answers');
      console.log(`Found ${answers.length} answers in SQLite`);
      
      let answerCount = 0;
      for (const answer of answers) {
        try {
          // Note: SQLite schema might have different field names than PostgreSQL
          await postgresqlPrisma.answer.create({
            data: {
              id: answer.id,
              content: cleanValue(answer.content, ''),
              notes: cleanValue(answer.notes),
              status: cleanValue(answer.status, 'PENDING'),
              grade: cleanValue(answer.grade),
              gradePoints: answer.gradePoints,
              submittedAt: parseDate(answer.submittedAt),
              reviewedAt: answer.reviewedAt ? parseDate(answer.reviewedAt) : null,
              reviewedBy: cleanValue(answer.reviewedBy),
              feedback: cleanValue(answer.feedback),
              pointsAwarded: answer.pointsAwarded,
              resubmissionRequested: Boolean(answer.resubmissionRequested),
              resubmissionApproved: answer.resubmissionApproved ? Boolean(answer.resubmissionApproved) : null,
              resubmissionRequestedAt: answer.resubmissionRequestedAt ? parseDate(answer.resubmissionRequestedAt) : null,
              // Map old field names to new ones
              attachmentFileName: cleanValue(answer.attachmentName),
              attachmentFilePath: cleanValue(answer.attachmentUrl),
              attachmentFileSize: answer.attachmentFileSize,
              attachmentMimeType: cleanValue(answer.attachmentMimeType),
              userId: answer.userId,
              questionId: answer.questionId,
              cohortId: answer.cohortId || answer.questionId // fallback if cohortId missing
            }
          });
          console.log(`✅ Migrated answer for question ${answer.questionId}`);
          answerCount++;
        } catch (error) {
          console.log(`⚠️ Answer error:`, error.message);
        }
      }
      console.log(`✅ Answers migrated: ${answerCount}/${answers.length}`);
    } catch (error) {
      console.log('⚠️ Answer table error:', error.message);
    }

    // 4. Migrate Mini Answers
    console.log('\n📋 Migrating Mini Answers...');
    try {
      const miniAnswers = await runSQLiteQuery('SELECT * FROM mini_answers');
      console.log(`Found ${miniAnswers.length} mini answers in SQLite`);
      
      let miniAnswerCount = 0;
      for (const miniAnswer of miniAnswers) {
        try {
          // Need to get cohortId from the related question
          const miniQuestion = await postgresqlPrisma.miniQuestion.findUnique({
            where: { id: miniAnswer.miniQuestionId },
            include: { content: { include: { question: true } } }
          });
          
          if (miniQuestion && miniQuestion.content && miniQuestion.content.question) {
            await postgresqlPrisma.miniAnswer.create({
              data: {
                id: miniAnswer.id,
                linkUrl: cleanValue(miniAnswer.linkUrl),
                notes: cleanValue(miniAnswer.notes),
                submittedAt: parseDate(miniAnswer.createdAt), // Map createdAt to submittedAt
                userId: miniAnswer.userId,
                miniQuestionId: miniAnswer.miniQuestionId,
                cohortId: miniQuestion.content.question.cohortId
              }
            });
            console.log(`✅ Migrated mini answer for question ${miniAnswer.miniQuestionId}`);
            miniAnswerCount++;
          } else {
            console.log(`⚠️ Mini answer skipped - no related question found for ${miniAnswer.miniQuestionId}`);
          }
        } catch (error) {
          console.log(`⚠️ Mini answer error:`, error.message);
        }
      }
      console.log(`✅ Mini answers migrated: ${miniAnswerCount}/${miniAnswers.length}`);
    } catch (error) {
      console.log('⚠️ Mini answer table error:', error.message);
    }

    console.log('\n🎉 Final data migration completed!');

    // Get final counts
    const finalCounts = {
      users: await postgresqlPrisma.user.count(),
      cohorts: await postgresqlPrisma.cohort.count(),
      modules: await postgresqlPrisma.module.count(),
      questions: await postgresqlPrisma.question.count(),
      contents: await postgresqlPrisma.content.count(),
      miniQuestions: await postgresqlPrisma.miniQuestion.count(),
      answers: await postgresqlPrisma.answer.count(),
      miniAnswers: await postgresqlPrisma.miniAnswer.count(),
      cohortMembers: await postgresqlPrisma.cohortMember.count()
    };

    console.log('\n📊 Final Migration Summary:');
    console.log(`👤 Users: ${finalCounts.users}`);
    console.log(`👥 Cohorts: ${finalCounts.cohorts}`);
    console.log(`📚 Modules: ${finalCounts.modules}`);
    console.log(`❓ Questions: ${finalCounts.questions}`);
    console.log(`📄 Contents: ${finalCounts.contents}`);
    console.log(`🔍 Mini Questions: ${finalCounts.miniQuestions}`);
    console.log(`📝 Answers: ${finalCounts.answers}`);
    console.log(`📋 Mini Answers: ${finalCounts.miniAnswers}`);
    console.log(`👨‍🎓 Cohort Members: ${finalCounts.cohortMembers}`);

    // Close connections
    sqliteDb.close();
    await postgresqlPrisma.$disconnect();

  } catch (error) {
    console.error('❌ Error during final migration:', error);
    await postgresqlPrisma.$disconnect();
  }
}

migrateFinalData();
