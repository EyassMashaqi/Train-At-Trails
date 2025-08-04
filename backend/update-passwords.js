const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function updatePasswords() {
  console.log('🔐 Updating user passwords...');

  try {
    // Update Alice's password
    const alicePassword = await bcrypt.hash('password123', 10);
    await prisma.user.update({
      where: { email: 'alice@traintrails.com' },
      data: { password: alicePassword }
    });
    console.log('✅ Updated Alice\'s password to: password123');

    // Update Bob's password
    const bobPassword = await bcrypt.hash('password123', 10);
    await prisma.user.update({
      where: { email: 'bob@traintrails.com' },
      data: { password: bobPassword }
    });
    console.log('✅ Updated Bob\'s password to: password123');

    // Update Test user's password (keeping it as test123)
    const testPassword = await bcrypt.hash('test123', 10);
    await prisma.user.update({
      where: { email: 'test@traintrails.com' },
      data: { password: testPassword }
    });
    console.log('✅ Updated Test user\'s password to: test123');

    console.log('\n🎉 Password update complete!');
    console.log('\n📋 Updated User Accounts:');
    console.log('Alice: alice@traintrails.com / password123');
    console.log('Bob: bob@traintrails.com / password123');
    console.log('Test: test@traintrails.com / test123');
    console.log('Admin: admin@traintrails.com / admin123 (unchanged)');

  } catch (error) {
    console.error('❌ Error updating passwords:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePasswords();
