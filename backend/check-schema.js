const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const postgresqlPrisma = new PrismaClient();
const sqliteDbPath = path.join(__dirname, './prisma/dev.db');

async function checkSchemaCompatibility() {
  console.log('🔍 Checking schema compatibility...\n');

  try {
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

    // Get a sample user from SQLite to see the structure
    console.log('📝 Sample User from SQLite:');
    const sampleUser = await runSQLiteQuery('SELECT * FROM users LIMIT 1');
    console.log(sampleUser[0]);

    console.log('\n📝 Sample Cohort from SQLite:');
    const sampleCohort = await runSQLiteQuery('SELECT * FROM cohorts LIMIT 1');
    console.log(sampleCohort[0]);

    // Test creating a minimal user in PostgreSQL
    console.log('\n🧪 Testing minimal User creation in PostgreSQL...');
    try {
      const testUser = await postgresqlPrisma.user.create({
        data: {
          email: 'test-schema@example.com',
          password: 'test-password',
          fullName: 'Test User',
          trainName: 'Test Train'
        }
      });
      console.log('✅ User creation successful:', testUser.id);
      
      // Clean up
      await postgresqlPrisma.user.delete({
        where: { id: testUser.id }
      });
    } catch (error) {
      console.log('❌ User creation failed:', error.message);
    }

    // Test creating a minimal cohort in PostgreSQL
    console.log('\n🧪 Testing minimal Cohort creation in PostgreSQL...');
    try {
      const testCohort = await postgresqlPrisma.cohort.create({
        data: {
          cohortNumber: 999,
          name: 'Test Cohort',
          description: 'Test Description',
          startDate: new Date()
        }
      });
      console.log('✅ Cohort creation successful:', testCohort.id);
      
      // Clean up
      await postgresqlPrisma.cohort.delete({
        where: { id: testCohort.id }
      });
    } catch (error) {
      console.log('❌ Cohort creation failed:', error.message);
    }

    // Close connections
    sqliteDb.close();
    await postgresqlPrisma.$disconnect();

  } catch (error) {
    console.error('❌ Error during schema compatibility check:', error);
    await postgresqlPrisma.$disconnect();
  }
}

checkSchemaCompatibility();
