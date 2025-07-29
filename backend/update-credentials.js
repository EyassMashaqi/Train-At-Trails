const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function updateCorrectCredentials() {
  try {
    console.log('Updating users with correct credentials...');

    // Delete all existing users first
    await prisma.user.deleteMany({});
    console.log('Cleared existing users');

    // Hash passwords
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const userPasswordHash = await bcrypt.hash('password123', 10);
    const testPasswordHash = await bcrypt.hash('test123', 10);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@traintrails.com',
        password: adminPasswordHash,
        fullName: 'System Administrator',
        trainName: 'Admin Express',
        isAdmin: true,
        currentStep: 0
      }
    });
    console.log('✅ Created admin user: admin@traintrails.com / admin123');

    // Create Alice
    const aliceUser = await prisma.user.create({
      data: {
        email: 'alice@traintrails.com',
        password: userPasswordHash,
        fullName: 'Alice Johnson',
        trainName: 'Lightning Express',
        isAdmin: false,
        currentStep: 2
      }
    });
    console.log('✅ Created user: alice@traintrails.com / password123');

    // Create Bob
    const bobUser = await prisma.user.create({
      data: {
        email: 'bob@traintrails.com',
        password: userPasswordHash,
        fullName: 'Bob Smith',
        trainName: 'Thunder Rail',
        isAdmin: false,
        currentStep: 1
      }
    });
    console.log('✅ Created user: bob@traintrails.com / password123');

    // Create Test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@traintrails.com',
        password: testPasswordHash,
        fullName: 'Test User',
        trainName: 'Test Train',
        isAdmin: false,
        currentStep: 0
      }
    });
    console.log('✅ Created user: test@traintrails.com / test123');

    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Admin: admin@traintrails.com / admin123');
    console.log('User: alice@traintrails.com / password123');
    console.log('User: bob@traintrails.com / password123');
    console.log('User: test@traintrails.com / test123');
    console.log('\nAll users updated successfully!');

  } catch (error) {
    console.error('Failed to update credentials:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCorrectCredentials();
