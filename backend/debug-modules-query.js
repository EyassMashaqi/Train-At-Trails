const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugModulesQuery() {
  try {
    console.log('=== DEBUGGING MODULES QUERY ===\n');
    
    const userId = 'cmdwt61xv000cdr2fsrsk6qbh';
    const cohortId = 'cmdx1vv1s000012q6cd3rlg1q';
    
    // Simulate the exact query from the modules endpoint
    console.log('1. Testing basic module query...');
    const modules = await prisma.module.findMany({
      where: {
        cohortId: cohortId
      },
      orderBy: { moduleNumber: 'asc' }
    });
    
    console.log('Basic modules found:', modules.length);
    modules.forEach(m => console.log(`  - ${m.title} (${m.id}) - isReleased: ${m.isReleased}`));
    
    console.log('\n2. Testing module with questions query...');
    const modulesWithQuestions = await prisma.module.findMany({
      where: {
        cohortId: cohortId
      },
      include: {
        questions: true
      },
      orderBy: { moduleNumber: 'asc' }
    });
    
    modulesWithQuestions.forEach(m => {
      console.log(`Module: ${m.title}`);
      console.log(`  Total questions: ${m.questions.length}`);
      m.questions.forEach(q => {
        console.log(`    - ${q.title} (isReleased: ${q.isReleased}, topicNumber: ${q.topicNumber})`);
      });
    });
    
    console.log('\n3. Testing module with released questions query...');
    const modulesWithReleasedQuestions = await prisma.module.findMany({
      where: {
        cohortId: cohortId
      },
      include: {
        questions: {
          where: {
            isReleased: true
          }
        }
      },
      orderBy: { moduleNumber: 'asc' }
    });
    
    modulesWithReleasedQuestions.forEach(m => {
      console.log(`Module: ${m.title}`);
      console.log(`  Released questions: ${m.questions.length}`);
      m.questions.forEach(q => {
        console.log(`    - ${q.title} (isReleased: ${q.isReleased}, topicNumber: ${q.topicNumber})`);
      });
    });
    
    console.log('\n4. Testing full modules endpoint query...');
    const fullQuery = await prisma.module.findMany({
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
    
    fullQuery.forEach(m => {
      console.log(`Module: ${m.title}`);
      console.log(`  Questions from full query: ${m.questions.length}`);
      m.questions.forEach(q => {
        console.log(`    - ${q.title} (topicNumber: ${q.topicNumber})`);
        console.log(`      Contents: ${q.contents?.length || 0}`);
        q.contents?.forEach(c => {
          console.log(`        Content: ${c.title || 'Untitled'} - MiniQuestions: ${c.miniQuestions?.length || 0}`);
        });
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugModulesQuery();
