const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNewProgressAPI() {
  try {
    // Get a user
    const user = await prisma.user.findFirst({ where: { isAdmin: false } });
    if (!user) {
      console.log('No regular users found');
      return;
    }
    
    console.log('Testing new progress API for user:', user.fullName);
    
    // Simulate the new progress API call
    const releasedQuestions = await prisma.question.findMany({
      where: { 
        isReleased: true,
        questionNumber: { lte: user.currentStep + 1 }
      },
      include: {
        contents: {
          include: {
            miniQuestions: {
              where: { isReleased: true },
              include: {
                miniAnswers: {
                  where: { userId: user.id },
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
          where: { userId: user.id },
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
      orderBy: { questionNumber: 'asc' }
    });
    
    console.log('Found', releasedQuestions.length, 'released questions');
    
    releasedQuestions.forEach(q => {
      const contents = q.contents || [];
      const totalMiniQuestions = contents.reduce((total, content) => 
        total + content.miniQuestions.length, 0
      );
      const completedMiniQuestions = contents.reduce((total, content) =>
        total + content.miniQuestions.filter(mq => mq.miniAnswers.length > 0).length, 0
      );
      
      console.log(`Q${q.questionNumber}: ${q.title}`);
      console.log(`  Mini questions: ${completedMiniQuestions}/${totalMiniQuestions}`);
      console.log(`  Main answer: ${q.answers.length > 0 ? q.answers[0].status : 'None'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewProgressAPI();
