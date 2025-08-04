const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addGraduationFields() {
  console.log('🎓 Adding graduation fields to CohortMember...');

  try {
    // Add graduation fields to CohortMember table (SQLite doesn't support multiple ADD COLUMN)
    await prisma.$executeRaw`ALTER TABLE cohort_members ADD COLUMN isGraduated BOOLEAN DEFAULT FALSE`;
    console.log('✅ Added isGraduated field');
    
    await prisma.$executeRaw`ALTER TABLE cohort_members ADD COLUMN graduatedAt DATETIME NULL`;
    console.log('✅ Added graduatedAt field');
    
    await prisma.$executeRaw`ALTER TABLE cohort_members ADD COLUMN graduatedBy VARCHAR(255) NULL`;
    console.log('✅ Added graduatedBy field');

    console.log('✅ All graduation fields added successfully');
    
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️ Graduation fields already exist');
    } else {
      console.error('❌ Error adding graduation fields:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addGraduationFields();
