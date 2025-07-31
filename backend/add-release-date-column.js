const { PrismaClient } = require('@prisma/client');

async function addReleaseDateColumn() {
  const prisma = new PrismaClient();
  
  try {
    // Check if the column already exists
    const result = await prisma.$queryRaw`PRAGMA table_info(mini_questions);`;
    console.log('Current mini_questions table structure:', result);
    
    const hasReleaseDateColumn = result.some(column => column.name === 'releaseDate');
    
    if (!hasReleaseDateColumn) {
      console.log('Adding releaseDate column to mini_questions table...');
      await prisma.$executeRaw`ALTER TABLE mini_questions ADD COLUMN releaseDate DATETIME;`;
      console.log('Successfully added releaseDate column!');
    } else {
      console.log('releaseDate column already exists!');
    }
    
    // Verify the column was added
    const updatedResult = await prisma.$queryRaw`PRAGMA table_info(mini_questions);`;
    console.log('Updated mini_questions table structure:', updatedResult);
    
  } catch (error) {
    console.error('Error adding releaseDate column:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addReleaseDateColumn();
