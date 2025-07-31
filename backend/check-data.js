const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllData() {
  try {
    console.log('🔍 Checking database contents...\n');

    // Check users
    const users = await prisma.user.findMany();
    console.log(`👥 Users: ${users.length} found`);
    users.forEach(user => {
      console.log(`   - ${user.fullName} (${user.email}) - Train: ${user.trainName || 'None'} - Step: ${user.currentStep}`);
    });

    // Check modules
    const modules = await prisma.module.findMany({
      include: {
        questions: true
      }
    });
    console.log(`\n📚 Modules: ${modules.length} found`);
    modules.forEach(module => {
      console.log(`   - Module ${module.moduleNumber}: ${module.title} (${module.questions.length} questions)`);
    });

    // Check questions
    const questions = await prisma.question.findMany({
      include: {
        contents: {
          include: {
            miniQuestions: true
          }
        },
        answers: true
      }
    });
    console.log(`\n❓ Questions: ${questions.length} found`);
    questions.forEach(question => {
      const totalMiniQuestions = question.contents.reduce((total, content) => total + content.miniQuestions.length, 0);
      console.log(`   - Q${question.questionNumber}: ${question.title} (${question.answers.length} answers, ${totalMiniQuestions} mini questions)`);
    });

    // Check contents
    const contents = await prisma.content.findMany({
      include: {
        miniQuestions: true
      }
    });
    console.log(`\n📝 Content sections: ${contents.length} found`);
    contents.forEach(content => {
      console.log(`   - ${content.title}: ${content.miniQuestions.length} mini questions`);
    });

    // Check mini questions
    const miniQuestions = await prisma.miniQuestion.findMany();
    console.log(`\n🎯 Mini Questions: ${miniQuestions.length} found`);
    miniQuestions.forEach(mq => {
      console.log(`   - ${mq.title}: ${mq.question} (Released: ${mq.isReleased})`);
    });

    // Check answers
    const answers = await prisma.answer.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        },
        question: {
          select: {
            title: true,
            questionNumber: true
          }
        }
      }
    });
    console.log(`\n💬 Answers: ${answers.length} found`);
    answers.forEach(answer => {
      console.log(`   - ${answer.user.fullName} -> Q${answer.question.questionNumber}: ${answer.status} (${answer.submittedAt.toLocaleDateString()})`);
    });

    // Check mini answers
    const miniAnswers = await prisma.miniAnswer.findMany({
      include: {
        user: {
          select: {
            fullName: true
          }
        },
        miniQuestion: {
          select: {
            title: true
          }
        }
      }
    });
    console.log(`\n🔗 Mini Answers: ${miniAnswers.length} found`);
    miniAnswers.forEach(answer => {
      console.log(`   - ${answer.user.fullName} -> ${answer.miniQuestion.title}: ${answer.linkUrl}`);
    });

    console.log(`\n✅ Database scan complete!`);

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllData();
