const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLogin() {
  try {
    const email = 'bob@traintrails.com';
    console.log('🔍 Testing login for:', email);
    
    // Find user exactly like the auth route does
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', user.fullName);
    console.log('🔑 Stored password hash:', user.password);
    
    // Test password with the demo password
    const testPassword = 'demo123';
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log(`🔐 Password "${testPassword}" is valid:`, isValid);

    // Also test if hash was created correctly
    const testHash = await bcrypt.hash(testPassword, 10);
    console.log('🧪 Fresh hash for comparison:', testHash);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
