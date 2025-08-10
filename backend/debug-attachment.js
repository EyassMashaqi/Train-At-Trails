const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function debugAttachment() {
  try {
    const answerId = 'cme5g4gn4000ks9yrq3iyens8';
    
    console.log('🔍 Checking attachment details for answer:', answerId);
    
    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      select: {
        id: true,
        attachmentFileName: true,
        attachmentFilePath: true,
        attachmentMimeType: true,
        user: {
          select: {
            email: true,
            fullName: true
          }
        }
      }
    });
    
    if (!answer) {
      console.log('❌ Answer not found');
      return;
    }
    
    console.log('📋 Answer details:');
    console.log('   ID:', answer.id);
    console.log('   File Name:', answer.attachmentFileName);
    console.log('   File Path:', answer.attachmentFilePath);
    console.log('   MIME Type:', answer.attachmentMimeType);
    console.log('   User:', answer.user.fullName, '(' + answer.user.email + ')');
    
    if (answer.attachmentFilePath) {
      console.log('\n📁 File system check:');
      console.log('   Checking path:', answer.attachmentFilePath);
      
      // Check if file exists
      const exists = fs.existsSync(answer.attachmentFilePath);
      console.log('   File exists:', exists);
      
      if (exists) {
        const stats = fs.statSync(answer.attachmentFilePath);
        console.log('   File size:', stats.size, 'bytes');
        console.log('   Modified:', stats.mtime);
      }
      
      // Check relative path too
      const relativePath = path.join('uploads/attachments', path.basename(answer.attachmentFilePath));
      console.log('   Checking relative path:', relativePath);
      const relativeExists = fs.existsSync(relativePath);
      console.log('   Relative path exists:', relativeExists);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAttachment();
