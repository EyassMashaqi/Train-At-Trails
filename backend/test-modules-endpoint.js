const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testModulesEndpointQuery() {
  try {
    console.log('=== TESTING EXACT MODULES ENDPOINT QUERY ===\n');
    
    const userId = 'cmdwt61xv000cdr2fsrsk6qbh';
    const cohortId = 'cmdx1vv1s000012q6cd3rlg1q';
    
    // This is the EXACT query from the modules endpoint
    const modules = await prisma.module.findMany({
      where: {
        cohortId: cohortId
      },
      include: {
        questions: {
          where: {
            isReleased: true // Only include released questions/topics
          },
          include: {
            contents: {
              include: {
                miniQuestions: {
                  where: {
                    isReleased: true, // Only include released mini-questions
                    releaseDate: {
                      lte: new Date() // And release date must be in the past
                    }
                  },
                  include: {
                    miniAnswers: {
                      where: { userId },
                      select: {
                        id: true,
                        linkUrl: true,
                        notes: true,
                        submittedAt: true
                      }
                    }
                  },
                  orderBy: { orderIndex: 'asc' }
                }
              },
              orderBy: { orderIndex: 'asc' }
            },
            answers: {
              where: { 
                userId,
                cohortId: cohortId
              },
              select: {
                id: true,
                content: true,
                status: true,
                submittedAt: true,
                reviewedAt: true,
                feedback: true
              },
              orderBy: { submittedAt: 'desc' },
              take: 1
            }
          },
          orderBy: { topicNumber: 'asc' }
        }
      },
      orderBy: { moduleNumber: 'asc' }
    });

    console.log('=== RESULTS FROM EXACT MODULES QUERY ===\n');
    
    modules.forEach((module, index) => {
      console.log(`${index + 1}. Module: ${module.title} (${module.id})`);
      console.log(`   isReleased: ${module.isReleased}`);
      console.log(`   questions.length: ${module.questions.length}`);
      
      if (module.questions.length > 0) {
        module.questions.forEach((question, qIndex) => {
          console.log(`   ${qIndex + 1}. Question: ${question.title} (${question.id})`);
          console.log(`      isReleased: ${question.isReleased}`);
          console.log(`      topicNumber: ${question.topicNumber}`);
          console.log(`      contents.length: ${question.contents.length}`);
          console.log(`      answers.length: ${question.answers.length}`);
          
          question.contents.forEach((content, cIndex) => {
            console.log(`      ${cIndex + 1}. Content: ${content.title || 'Untitled'}`);
            console.log(`         miniQuestions.length: ${content.miniQuestions.length}`);
          });
        });
      } else {
        console.log(`   No questions found in this module`);
      }
      console.log('');
    });
    
    // Calculate formatted result like the endpoint does
    const formattedModules = modules.map((module) => ({
      id: module.id,
      moduleNumber: module.moduleNumber,
      title: module.title,
      isReleased: module.isReleased,
      topicsCount: module.questions.length // This is the key line
    }));
    
    console.log('=== FORMATTED MODULES (WHAT API RETURNS) ===\n');
    formattedModules.forEach(m => {
      console.log(`${m.moduleNumber}. ${m.title} - topicsCount: ${m.topicsCount} (isReleased: ${m.isReleased})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testModulesEndpointQuery();
