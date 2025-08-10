const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAttachments() {
  try {
    console.log('🔍 Checking for answers with attachments...');
    
    const answersWithAttachments = await prisma.answer.findMany({
      where: {
        attachmentFileName: { not: null }
      },
      select: {
        id: true,
        attachmentFileName: true,
        attachmentFilePath: true,
        user: {
          select: {
            email: true,
            fullName: true
          }
        }
      }
    });
    
    console.log('📎 Found answers with attachments:', answersWithAttachments.length);
    
    if (answersWithAttachments.length > 0) {
      console.log('📋 Details:');
      answersWithAttachments.forEach((answer, index) => {
        console.log(`${index + 1}. Answer ID: ${answer.id}`);
        console.log(`   File: ${answer.attachmentFileName}`);
        console.log(`   Path: ${answer.attachmentFilePath}`);
        console.log(`   User: ${answer.user.fullName} (${answer.user.email})`);
        console.log('---');
      });
    }
    
    // Check admin users
    console.log('👑 Checking admin users...');
    const adminUsers = await prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        isAdmin: true
      }
    });
    
    console.log('👑 Admin users:');
    adminUsers.forEach(admin => {
      console.log(`   ${admin.fullName} (${admin.email}) - ID: ${admin.id}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAttachments();
