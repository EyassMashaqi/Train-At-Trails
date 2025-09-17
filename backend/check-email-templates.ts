import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmailTemplates() {
  console.log('📧 Checking email templates...');
  
  try {
    const welcomeTemplate = await prisma.globalEmailTemplate.findUnique({
      where: { emailType: 'WELCOME' }
    });

    if (welcomeTemplate) {
      console.log('\n🚂 WELCOME Email Template:');
      console.log('Subject:', welcomeTemplate.subject);
      console.log('\n📄 HTML Content:');
      console.log(welcomeTemplate.htmlContent);
      console.log('\n📝 Text Content:');
      console.log(welcomeTemplate.textContent);
      console.log('\n' + '='.repeat(80));
    }

    const allTemplates = await prisma.globalEmailTemplate.findMany({
      select: {
        emailType: true,
        name: true,
        textContent: true
      }
    });

    console.log('\n📋 All Template Text Content:');
    allTemplates.forEach(template => {
      console.log(`\n${template.emailType} (${template.name}):`);
      console.log(`"${template.textContent}"`);
    });

  } catch (error) {
    console.error('❌ Error checking email templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmailTemplates();