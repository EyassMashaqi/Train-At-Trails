const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function detailedProgressTest() {
  try {
    // Get a user
    const user = await prisma.user.findFirst({ where: { isAdmin: false } });
    if (!user) {
      console.log('No regular users found');
      return;
    }
    
    console.log('Testing Progress API Structure for user:', user.fullName);
    console.log('Current Step:', user.currentStep);
    console.log('='.repeat(50));
    
    // Get all released questions with their mini questions (same logic as backend)
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

    console.log('Found', releasedQuestions.length, 'released questions\\n');

    // Process and format the response exactly like the backend does
    const processedQuestions = releasedQuestions.map((question) => {
      const contents = question.contents || [];
      const totalMiniQuestions = contents.reduce((total, content) => 
        total + content.miniQuestions.length, 0
      );
      
      const completedMiniQuestions = contents.reduce((total, content) =>
        total + content.miniQuestions.filter((mq) => mq.miniAnswers.length > 0).length, 0
      );

      const canSolveMainQuestion = totalMiniQuestions === 0 || completedMiniQuestions === totalMiniQuestions;
      const hasMainAnswer = question.answers.length > 0;
      const mainAnswerStatus = hasMainAnswer ? question.answers[0].status : null;

      // Determine question availability
      let questionStatus = 'locked';
      if (question.questionNumber <= user.currentStep + 1) {
        if (totalMiniQuestions > 0) {
          if (completedMiniQuestions < totalMiniQuestions) {
            questionStatus = 'mini_questions_required';
          } else if (canSolveMainQuestion && !hasMainAnswer) {
            questionStatus = 'available';
          } else if (hasMainAnswer) {
            questionStatus = mainAnswerStatus === 'APPROVED' ? 'completed' : 'submitted';
          }
        } else {
          if (!hasMainAnswer) {
            questionStatus = 'available';
          } else {
            questionStatus = mainAnswerStatus === 'APPROVED' ? 'completed' : 'submitted';
          }
        }
      }

      return {
        id: question.id,
        questionNumber: question.questionNumber,
        title: question.title,
        content: question.content,
        description: question.description,
        deadline: question.deadline,
        points: question.points,
        bonusPoints: question.bonusPoints,
        status: questionStatus,
        canSolveMainQuestion,
        hasMainAnswer,
        mainAnswer: hasMainAnswer ? question.answers[0] : null,
        miniQuestionProgress: {
          total: totalMiniQuestions,
          completed: completedMiniQuestions,
          percentage: totalMiniQuestions > 0 ? Math.round((completedMiniQuestions / totalMiniQuestions) * 100) : 0
        },
        contents: contents.map((content) => ({
          id: content.id,
          title: content.title,
          material: content.material,
          orderIndex: content.orderIndex,
          miniQuestions: content.miniQuestions.map((mq) => ({
            id: mq.id,
            title: mq.title,
            question: mq.question,
            description: mq.description,
            orderIndex: mq.orderIndex,
            isReleased: mq.isReleased,
            releaseDate: mq.releaseDate,
            hasAnswer: mq.miniAnswers.length > 0,
            answer: mq.miniAnswers.length > 0 ? mq.miniAnswers[0] : null
          }))
        }))
      };
    });

    // Create the final response structure
    const apiResponse = {
      user: {
        id: user.id,
        fullName: user.fullName,
        trainName: user.trainName,
        currentStep: user.currentStep,
        createdAt: user.createdAt
      },
      currentStep: user.currentStep,
      totalSteps: 12,
      totalQuestions: await prisma.question.count(),
      isComplete: user.currentStep >= 12,
      questions: processedQuestions
    };

    console.log('COMPLETE API RESPONSE STRUCTURE:');
    console.log('================================');
    console.log(JSON.stringify(apiResponse, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

detailedProgressTest();
