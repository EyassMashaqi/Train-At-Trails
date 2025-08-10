const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testAdminAuth() {
  try {
    // Check admin user
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@traintrails.com' },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        fullName: true
      }
    });
    
    console.log('👑 Admin user found:', admin);
    
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    
    // Generate a test token
    const JWT_SECRET = process.env.JWT_SECRET || 'train-at-trails-super-secure-test-secret-key-2025';
    const token = jwt.sign(
      { 
        userId: admin.id,
        email: admin.email,
        isAdmin: admin.isAdmin
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('🔑 Generated token for admin:', token.substring(0, 50) + '...');
    
    // Test token verification
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token verified successfully:', decoded);
    } catch (verifyError) {
      console.log('❌ Token verification failed:', verifyError.message);
    }
    
    // Test API endpoint with curl
    console.log('\n🧪 You can test the endpoint with:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/admin/answer/cme5g4gn4000ks9yrq3iyens8/attachment`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminAuth();
