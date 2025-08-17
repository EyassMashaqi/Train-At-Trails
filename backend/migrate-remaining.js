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

async function migrateRemainingData() {
  console.log('🚀 Starting remaining data migration...\n');

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

    // 1. Fix the failed user by checking if their cohort exists
    console.log('🔧 Fixing failed user...');
    const failedUsers = await runSQLiteQuery('SELECT * FROM users WHERE email = ?', ['alice@traintrails.com']);
    
    if (failedUsers.length > 0) {
      const user = failedUsers[0];
      const cohortExists = await postgresqlPrisma.cohort.findUnique({
        where: { id: user.currentCohortId }
      });
      
      if (cohortExists) {
        // Cohort exists, retry with original data
        try {
          await postgresqlPrisma.user.create({
            data: {
              id: user.id,
              email: user.email,
              password: user.password,
              fullName: user.fullName,
              trainName: cleanValue(user.trainName, 'Adventure Express'),
              isAdmin: Boolean(user.isAdmin),
              currentStep: user.currentStep || 0,
              currentCohortId: user.currentCohortId,
              createdAt: parseDate(user.createdAt),
              updatedAt: parseDate(user.updatedAt)
            }
          });
          console.log(`✅ Fixed user: ${user.email}`);
        } catch (error) {
          console.log(`⚠️ User ${user.email} still failed:`, error.message);
        }
      } else {
        // Cohort doesn't exist, create user without currentCohortId
        try {
          await postgresqlPrisma.user.create({
            data: {
              id: user.id,
              email: user.email,
              password: user.password,
              fullName: user.fullName,
              trainName: cleanValue(user.trainName, 'Adventure Express'),
              isAdmin: Boolean(user.isAdmin),
              currentStep: user.currentStep || 0,
              currentCohortId: null, // Set to null since cohort doesn't exist
              createdAt: parseDate(user.createdAt),
              updatedAt: parseDate(user.updatedAt)
            }
          });
          console.log(`✅ Fixed user: ${user.email} (without cohort reference)`);
        } catch (error) {
          console.log(`⚠️ User ${user.email} still failed:`, error.message);
        }
      }
    }

    // 2. Migrate CohortMembers
    console.log('\n👨‍🎓 Migrating Cohort Members...');
    try {
      const cohortMembers = await runSQLiteQuery('SELECT * FROM cohort_members');
      console.log(`Found ${cohortMembers.length} cohort members in SQLite`);
      
      let cohortMemberCount = 0;
      for (const member of cohortMembers) {
        try {
          await postgresqlPrisma.cohortMember.create({
            data: {
              id: member.id,
              userId: member.userId,
              cohortId: member.cohortId,
              currentStep: member.currentStep || 0,
              joinedAt: parseDate(member.joinedAt),
              status: cleanValue(member.status, 'ENROLLED'),
              statusChangedAt: parseDate(member.statusChangedAt || member.joinedAt),
              statusChangedBy: cleanValue(member.statusChangedBy),
              isActive: Boolean(member.isActive),
              isGraduated: Boolean(member.isGraduated),
              graduatedAt: member.graduatedAt ? parseDate(member.graduatedAt) : null,
              graduatedBy: cleanValue(member.graduatedBy)
            }
          });
          console.log(`✅ Migrated cohort member: ${member.userId} -> ${member.cohortId}`);
          cohortMemberCount++;
        } catch (error) {
          console.log(`⚠️ Cohort member error:`, error.message);
        }
      }
      console.log(`✅ Cohort members migrated: ${cohortMemberCount}/${cohortMembers.length}`);
    } catch (error) {
      console.log('⚠️ CohortMember table might not exist or be empty:', error.message);
    }

    // 3. Migrate Questions
    console.log('\n❓ Migrating Questions...');
    try {
      const questions = await runSQLiteQuery('SELECT * FROM questions');
      console.log(`Found ${questions.length} questions in SQLite`);
      
      let questionCount = 0;
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
              cohortId: question.cohortId
            }
          });
          console.log(`✅ Migrated question: ${question.title}`);
          questionCount++;
        } catch (error) {
          console.log(`⚠️ Question ${question.title} error:`, error.message);
        }
      }
      console.log(`✅ Questions migrated: ${questionCount}/${questions.length}`);
    } catch (error) {
      console.log('⚠️ Question table error:', error.message);
    }

    console.log('\n🎉 Remaining data migration completed!');

    // Close connections
    sqliteDb.close();
    await postgresqlPrisma.$disconnect();

  } catch (error) {
    console.error('❌ Error during remaining migration:', error);
    await postgresqlPrisma.$disconnect();
  }
}

migrateRemainingData();
