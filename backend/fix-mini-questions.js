const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMiniQuestionRelease() {
  try {
    console.log('🔍 Finding unreleased questions with released mini-questions...\n');
    
    const unreleasedQuestions = await prisma.question.findMany({
      where: { isReleased: false },
      include: {
        contents: {
          include: {
            miniQuestions: true // Get ALL mini-questions, not just released ones
          }
        }
      }
    });
    
    console.log(`Found ${unreleasedQuestions.length} unreleased questions`);
    
    let totalMiniQuestionsToUnrelease = 0;
    
    for (const question of unreleasedQuestions) {
      const allMiniQuestions = question.contents.flatMap(content => content.miniQuestions);
      const releasedMiniQuestions = allMiniQuestions.filter(mq => mq.isReleased);
      totalMiniQuestionsToUnrelease += releasedMiniQuestions.length;
      
      if (releasedMiniQuestions.length > 0) {
        console.log(`\n📋 Question: ${question.title}`);
        console.log(`   - Total mini-questions: ${allMiniQuestions.length}`);
        console.log(`   - Released mini-questions to unrelease: ${releasedMiniQuestions.length}`);
        
        for (const miniQuestion of releasedMiniQuestions) {
          console.log(`   - Unreleasing: ${miniQuestion.title}`);
          await prisma.miniQuestion.update({
            where: { id: miniQuestion.id },
            data: {
              isReleased: false,
              actualReleaseDate: null
            }
          });
        }
      } else if (allMiniQuestions.length > 0) {
        console.log(`\n✅ Question: ${question.title} - All ${allMiniQuestions.length} mini-questions already unreleased`);
      }
    }
    
    console.log(`\n✅ Successfully unreleased ${totalMiniQuestionsToUnrelease} mini-questions`);
    console.log('🎯 All mini-questions for unreleased questions are now properly unreleased');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMiniQuestionRelease();
