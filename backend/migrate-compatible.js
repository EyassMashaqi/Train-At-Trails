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

async function migrateCompatibleData() {
  console.log('🚀 Starting compatible data migration...\n');

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

    // 1. Migrate Users (using only compatible fields)
    console.log('👤 Migrating Users...');
    const users = await runSQLiteQuery('SELECT * FROM users');
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
            trainName: cleanValue(user.trainName, 'Adventure Express'),
            isAdmin: Boolean(user.isAdmin),
            currentStep: user.currentStep || 0,
            currentCohortId: cleanValue(user.currentCohortId),
            createdAt: parseDate(user.createdAt),
            updatedAt: parseDate(user.updatedAt)
            // Skip: hasGraduated, graduationDate, overallGrade, gameStartDate (not in PostgreSQL schema)
          }
        });
        console.log(`✅ Migrated user: ${user.email}`);
        userCount++;
      } catch (error) {
        console.log(`⚠️ User ${user.email} error:`, error.message);
      }
    }

    // 2. Migrate Cohorts (using only compatible fields)
    console.log('\n👥 Migrating Cohorts...');
    const cohorts = await runSQLiteQuery('SELECT * FROM cohorts');
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
            createdAt: parseDate(cohort.createdAt),
            updatedAt: parseDate(cohort.updatedAt)
            // Skip: maxParticipants, trainName (not in PostgreSQL schema)
          }
        });
        console.log(`✅ Migrated cohort: ${cohort.name}`);
        cohortCount++;
      } catch (error) {
        console.log(`⚠️ Cohort ${cohort.name} error:`, error.message);
      }
    }

    // 3. Migrate Modules (they depend on cohorts)
    console.log('\n📚 Migrating Modules...');
    try {
      const modules = await runSQLiteQuery('SELECT * FROM modules');
      console.log(`Found ${modules.length} modules in SQLite`);
      
      let moduleCount = 0;
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
              cohortId: module.cohortId
            }
          });
          console.log(`✅ Migrated module: ${module.title}`);
          moduleCount++;
        } catch (error) {
          console.log(`⚠️ Module ${module.title} error:`, error.message);
        }
      }
    } catch (error) {
      console.log('⚠️ Module table might not exist or be empty');
    }

    console.log(`\n🎉 Compatible data migration completed!`);
    console.log(`✅ Users migrated: ${userCount}/${users.length}`);
    console.log(`✅ Cohorts migrated: ${cohortCount}/${cohorts.length}`);

    // Close connections
    sqliteDb.close();
    await postgresqlPrisma.$disconnect();

  } catch (error) {
    console.error('❌ Error during migration:', error);
    await postgresqlPrisma.$disconnect();
  }
}

migrateCompatibleData();
