const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkQuestionsWithoutCohort() {
  try {
    console.log('🔍 CHECKING ALL QUESTIONS AND THEIR COHORTS\n');
    
    // Find the HTML Fundamentals question specifically
    const htmlQuestion = await prisma.question.findFirst({
      where: {
        title: 'HTML Fundamentals'
      },
      select: {
        id: true,
        questionNumber: true,
        title: true,
        isReleased: true,
        cohortId: true,
        cohort: {
          select: {
            name: true
          }
        }
      }
    });
    
    if (htmlQuestion) {
      console.log('🔍 HTML FUNDAMENTALS QUESTION:');
      console.log(`   Question ${htmlQuestion.questionNumber}: ${htmlQuestion.title}`);
      console.log(`   Released: ${htmlQuestion.isReleased}`);
      console.log(`   Cohort ID: ${htmlQuestion.cohortId}`);
      console.log(`   Cohort Name: ${htmlQuestion.cohort?.name || 'No cohort'}`);
    } else {
      console.log('❌ HTML Fundamentals question not found');
    }
    console.log('');
    
    // Find all released questions and their cohorts
    const releasedQuestions = await prisma.question.findMany({
      where: {
        isReleased: true
      },
      select: {
        id: true,
        questionNumber: true,
        title: true,
        cohortId: true,
        cohort: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        questionNumber: 'asc'
      }
    });
    
    console.log('✅ ALL RELEASED QUESTIONS:');
    if (releasedQuestions.length === 0) {
      console.log('   No released questions found');
    } else {
      releasedQuestions.forEach(q => {
        console.log(`   Question ${q.questionNumber}: ${q.title}`);
        console.log(`     Cohort: ${q.cohort?.name || 'No cohort'} (ID: ${q.cohortId || 'NULL'})`);
      });
    }
    console.log('');
    
    // Find all questions and their cohorts
    const allQuestions = await prisma.question.findMany({
      select: {
        id: true,
        questionNumber: true,
        title: true,
        isReleased: true,
        cohortId: true,
        cohort: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        questionNumber: 'asc'
      }
    });
    
    console.log('📝 ALL QUESTIONS BY COHORT:');
    const questionsByCohort = {};
    allQuestions.forEach(q => {
      const cohortName = q.cohort?.name || 'Unknown';
      if (!questionsByCohort[cohortName]) {
        questionsByCohort[cohortName] = [];
      }
      questionsByCohort[cohortName].push(q);
    });
    
    Object.entries(questionsByCohort).forEach(([cohortName, questions]) => {
      console.log(`\n   ${cohortName}:`);
      questions.forEach(q => {
        console.log(`     Question ${q.questionNumber}: ${q.title} (Released: ${q.isReleased})`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkQuestionsWithoutCohort().catch(console.error);
