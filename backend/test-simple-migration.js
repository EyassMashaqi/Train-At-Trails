const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const postgresqlPrisma = new PrismaClient();
const sqliteDbPath = path.join(__dirname, './prisma/dev.db');

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

async function testSimpleMigration() {
  console.log('🧪 Testing simple data migration...\n');

  try {
    // Connect to SQLite database
    const sqliteDb = new sqlite3.Database(sqliteDbPath);

    // Helper function to run SQLite queries
    function runSQLiteQuery(query, params = []) {
      return new Promise((resolve, reject) => {
        sqliteDb.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }

    // 1. Test migrating just users
    console.log('👤 Testing User Migration...');
    const users = await runSQLiteQuery('SELECT * FROM users LIMIT 5');
    console.log(`Found ${users.length} users in SQLite`);
    
    let userCount = 0;
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
        userCount++;
      } catch (error) {
        console.log(`⚠️ User ${user.email} error:`, error.message);
      }
    }

    // 2. Test migrating just cohorts
    console.log('\n👥 Testing Cohort Migration...');
    const cohorts = await runSQLiteQuery('SELECT * FROM cohorts LIMIT 5');
    console.log(`Found ${cohorts.length} cohorts in SQLite`);
    
    let cohortCount = 0;
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
        cohortCount++;
      } catch (error) {
        console.log(`⚠️ Cohort ${cohort.name} error:`, error.message);
      }
    }

    console.log(`\n🎉 Simple migration test completed!`);
    console.log(`✅ Users migrated: ${userCount}`);
    console.log(`✅ Cohorts migrated: ${cohortCount}`);

    // Close connections
    sqliteDb.close();
    await postgresqlPrisma.$disconnect();

  } catch (error) {
    console.error('❌ Error during simple migration test:', error);
    await postgresqlPrisma.$disconnect();
  }
}

testSimpleMigration();
