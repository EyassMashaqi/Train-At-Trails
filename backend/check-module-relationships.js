const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkModuleQuestionRelationship() {
  try {
    console.log('=== CHECKING MODULE-QUESTION RELATIONSHIPS ===\n');
    
    // First, find the "Modern JavaScript ES6+" question
    const jsQuestion = await prisma.question.findFirst({
      where: {
        title: 'Modern JavaScript ES6+'
      },
      include: {
        module: true
      }
    });
    
    if (jsQuestion) {
      console.log('Found JS Question:', {
        id: jsQuestion.id,
        title: jsQuestion.title,
        isReleased: jsQuestion.isReleased,
        moduleId: jsQuestion.moduleId,
        module: jsQuestion.module ? {
          id: jsQuestion.module.id,
          title: jsQuestion.module.title,
          moduleNumber: jsQuestion.module.moduleNumber,
          isReleased: jsQuestion.module.isReleased,
          cohortId: jsQuestion.module.cohortId
        } : null
      });
    } else {
      console.log('❌ Could not find "Modern JavaScript ES6+" question');
    }
    
    console.log('\n=== ALL MODULES WITH QUESTION COUNTS ===\n');
    
    // Get all modules with their released question counts
    const modules = await prisma.module.findMany({
      include: {
        questions: {
          where: {
            isReleased: true
          }
        }
      },
      orderBy: { moduleNumber: 'asc' }
    });
    
    modules.forEach(module => {
      console.log(`Module ${module.moduleNumber}: ${module.title}`, {
        id: module.id,
        isReleased: module.isReleased,
        cohortId: module.cohortId,
        releasedQuestions: module.questions.length,
        questionTitles: module.questions.map(q => q.title)
      });
    });
    
    console.log('\n=== ALL RELEASED QUESTIONS ===\n');
    
    // Get all released questions
    const releasedQuestions = await prisma.question.findMany({
      where: {
        isReleased: true
      },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            moduleNumber: true
          }
        }
      },
      orderBy: { title: 'asc' }
    });
    
    releasedQuestions.forEach(question => {
      console.log(`Question: ${question.title}`, {
        id: question.id,
        isReleased: question.isReleased,
        moduleId: question.moduleId,
        module: question.module
      });
    });
    
    console.log('\n=== CHECKING COHORT FILTERING ===\n');
    
    // Check if cohort filtering is affecting results
    const cohorts = await prisma.cohort.findMany({
      include: {
        modules: {
          include: {
            questions: {
              where: {
                isReleased: true
              }
            }
          }
        }
      }
    });
    
    cohorts.forEach(cohort => {
      console.log(`Cohort: ${cohort.name} (${cohort.id})`);
      cohort.modules.forEach(module => {
        console.log(`  Module ${module.moduleNumber}: ${module.title} - ${module.questions.length} released questions`);
        module.questions.forEach(question => {
          console.log(`    - ${question.title}`);
        });
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkModuleQuestionRelationship();
