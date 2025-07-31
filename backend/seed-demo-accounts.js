const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Demo accounts specification
const demoAccounts = [
  {
    email: 'admin@traintrails.com',
    password: 'admin123',
    fullName: 'System Administrator',
    trainName: 'Admin Express',
    isAdmin: true,
    currentStep: 0
  },
  {
    email: 'alice@traintrails.com',
    password: 'password123',
    fullName: 'Alice Johnson',
    trainName: 'Lightning Express',
    isAdmin: false,
    currentStep: 2
  },
  {
    email: 'bob@traintrails.com',
    password: 'password123',
    fullName: 'Bob Smith',
    trainName: 'Thunder Rail',
    isAdmin: false,
    currentStep: 1
  },
  {
    email: 'test@traintrails.com',
    password: 'test123',
    fullName: 'Test User',
    trainName: 'Test Express',
    isAdmin: false,
    currentStep: 0
  }
];

const modules = [
  {
    moduleNumber: 1,
    title: "Leadership Foundation",
    description: "Building core leadership skills and self-awareness",
    topics: [
      {
        topicNumber: 1,
        title: "Leadership Development",
        content: "Explore fundamental leadership principles and your personal leadership style.",
        description: "Understanding your leadership journey and developing core leadership competencies.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 2,
        title: "Continuous Learning Plan & Skill Learning",
        content: "Create a structured approach to continuous learning and skill development.",
        description: "Develop a personalized learning plan to enhance your professional skills.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 3,
        title: "Reflection & Emotional Intelligence",
        content: "Develop self-awareness and emotional intelligence capabilities.",
        description: "Learn to reflect on your experiences and build emotional intelligence.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 4,
        title: "Presentation",
        content: "Present your learning and insights from Module One.",
        description: "Showcase your understanding of leadership development concepts.",
        points: 150,
        bonusPoints: 75
      }
    ]
  },
  {
    moduleNumber: 2,
    title: "Team Leadership & Communication",
    description: "Advanced team leadership and communication skills",
    topics: [
      {
        topicNumber: 1,
        title: "Team Building & Dynamics",
        content: "Learn effective team building strategies and understand team dynamics.",
        description: "Build high-performing teams and understand group psychology.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 2,
        title: "Communication Excellence",
        content: "Master various communication styles and techniques.",
        description: "Develop advanced communication skills for leadership contexts.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 3,
        title: "Conflict Resolution",
        content: "Learn to manage and resolve conflicts effectively.",
        description: "Develop skills to handle workplace conflicts and difficult conversations.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 4,
        title: "Team Leadership Project",
        content: "Apply team leadership concepts in a practical project.",
        description: "Lead a team project demonstrating your leadership and communication skills.",
        points: 150,
        bonusPoints: 75
      }
    ]
  },
  {
    moduleNumber: 3,
    title: "Strategic Leadership & Innovation",
    description: "Strategic thinking and innovation leadership",
    topics: [
      {
        topicNumber: 1,
        title: "Strategic Thinking",
        content: "Develop strategic thinking capabilities and long-term vision.",
        description: "Learn to think strategically and create sustainable competitive advantages.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 2,
        title: "Innovation Leadership",
        content: "Lead innovation initiatives and foster creative thinking.",
        description: "Drive innovation and lead creative problem-solving efforts.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 3,
        title: "Change Management",
        content: "Master change management principles and practices.",
        description: "Lead organizational change and manage transformation initiatives.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 4,
        title: "Capstone Leadership Project",
        content: "Complete a comprehensive leadership project.",
        description: "Integrate all leadership concepts in a final capstone project.",
        points: 200,
        bonusPoints: 100
      }
    ]
  }
];

async function seedDatabase() {
  console.log('🌱 Starting comprehensive database seeding...');
  
  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma.miniAnswer.deleteMany({});
    await prisma.answer.deleteMany({});
    await prisma.miniQuestion.deleteMany({});
    await prisma.content.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.module.deleteMany({});
    await prisma.user.deleteMany({});

    // Create demo accounts
    console.log('👥 Creating demo accounts...');
    const createdUsers = [];
    for (const account of demoAccounts) {
      const hashedPassword = await bcrypt.hash(account.password, 10);
      
      const user = await prisma.user.create({
        data: {
          email: account.email,
          password: hashedPassword,
          fullName: account.fullName,
          trainName: account.trainName,
          isAdmin: account.isAdmin,
          currentStep: account.currentStep
        }
      });
      
      createdUsers.push(user);
      console.log(`   ✅ ${user.fullName} (${user.email})`);
    }

    // Create modules and questions
    console.log('📚 Creating modules and questions...');
    let questionCounter = 1;
    
    for (const moduleData of modules) {
      const module = await prisma.module.create({
        data: {
          moduleNumber: moduleData.moduleNumber,
          title: moduleData.title,
          description: moduleData.description,
          isActive: false,
          isReleased: moduleData.moduleNumber === 1 // Release first module
        }
      });

      console.log(`   📖 Module ${module.moduleNumber}: ${module.title}`);

      for (const topicData of moduleData.topics) {
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + 30); // 30 days from now

        const question = await prisma.question.create({
          data: {
            questionNumber: questionCounter,
            title: topicData.title,
            content: topicData.content,
            description: topicData.description,
            deadline: deadlineDate,
            points: topicData.points,
            bonusPoints: topicData.bonusPoints,
            isActive: false,
            isReleased: questionCounter <= 3, // Release first 3 questions
            moduleId: module.id,
            topicNumber: topicData.topicNumber
          }
        });

        console.log(`      📝 Q${questionCounter}: ${question.title}`);

        // Create content sections and mini-questions for the first 3 questions only
        if (questionCounter <= 3) {
          const contentSection = await prisma.content.create({
            data: {
              title: 'Learning Material',
              material: `Study materials and resources for ${topicData.title}`,
              orderIndex: 1,
              questionId: question.id
            }
          });

          // Create mini-questions
          const miniQuestionTypes = [
            { type: 'Research Task', desc: `Research and share a link to an article or resource related to ${topicData.title}` },
            { type: 'Case Study Analysis', desc: `Find and analyze a case study related to ${topicData.title}` },
            { type: 'Practical Application', desc: `Create or find an example of practical application of ${topicData.title} concepts` }
          ];

          for (let i = 0; i < miniQuestionTypes.length; i++) {
            const miniQType = miniQuestionTypes[i];
            const releaseDate = new Date();
            releaseDate.setDate(releaseDate.getDate() + (i * 2)); // Release every 2 days

            await prisma.miniQuestion.create({
              data: {
                title: miniQType.type,
                question: miniQType.desc,
                description: miniQType.desc,
                orderIndex: i + 1,
                contentId: contentSection.id,
                releaseDate: releaseDate,
                isReleased: i === 0 && questionCounter === 1, // Only release first mini question of first question
                actualReleaseDate: i === 0 && questionCounter === 1 ? new Date() : null
              }
            });
          }

          // Create additional interactive content section
          const interactiveSection = await prisma.content.create({
            data: {
              title: 'Interactive Exercises',
              material: `Interactive exercises and activities for ${topicData.title}`,
              orderIndex: 2,
              questionId: question.id
            }
          });

          // Create one mini-question for interactive section
          const interactiveReleaseDate = new Date();
          interactiveReleaseDate.setDate(interactiveReleaseDate.getDate() + 6); // Release after 6 days

          await prisma.miniQuestion.create({
            data: {
              title: 'Interactive Exercise',
              question: `Complete the interactive exercise for ${topicData.title}`,
              description: `Engage with the interactive content to deepen your understanding of ${topicData.title}`,
              orderIndex: 1,
              contentId: interactiveSection.id,
              releaseDate: interactiveReleaseDate,
              isReleased: false
            }
          });
        }

        questionCounter++;
      }
    }

    // Create sample answers and mini-answers
    console.log('💬 Creating sample answers...');
    const regularUsers = createdUsers.filter(u => !u.isAdmin);
    
    if (regularUsers.length > 0) {
      const firstQuestion = await prisma.question.findFirst({
        where: { questionNumber: 1 }
      });

      if (firstQuestion) {
        // Alice's approved answer
        const aliceAnswer = await prisma.answer.create({
          data: {
            content: "Leadership development is a continuous journey of self-improvement and skill building. Through my research and reflection, I've identified key areas where I need to grow as a leader, including emotional intelligence, strategic thinking, and team communication. I plan to focus on developing these areas through targeted learning and practical application.",
            submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            status: 'APPROVED',
            reviewedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
            feedback: "Excellent reflection on leadership development. Your identification of key growth areas shows strong self-awareness. Great work!",
            userId: regularUsers[0].id, // Alice
            questionId: firstQuestion.id
          }
        });

        // Bob's pending answer
        const bobAnswer = await prisma.answer.create({
          data: {
            content: "I think leadership is about telling people what to do and making sure they follow instructions. A good leader should be strict and maintain authority at all times.",
            submittedAt: new Date(),
            status: 'PENDING',
            userId: regularUsers[1].id, // Bob
            questionId: firstQuestion.id
          }
        });

        // Create mini-answers for the first released mini-question
        const firstMiniQuestion = await prisma.miniQuestion.findFirst({
          where: { isReleased: true }
        });

        if (firstMiniQuestion) {
          // Alice's mini-answer
          await prisma.miniAnswer.create({
            data: {
              content: "https://hbr.org/2019/10/the-future-leader-9-skills-and-mindsets-to-succeed-in-the-next-transformation",
              submittedAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
              userId: regularUsers[0].id, // Alice
              miniQuestionId: firstMiniQuestion.id
            }
          });

          // Bob's mini-answer
          await prisma.miniAnswer.create({
            data: {
              content: "https://www.forbes.com/sites/forbescoachescouncil/2021/03/15/20-leadership-development-strategies-to-help-your-team-succeed/",
              submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
              userId: regularUsers[1].id, // Bob
              miniQuestionId: firstMiniQuestion.id
            }
          });
        }
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    
    // Display summary
    const stats = await getStats();
    console.log('\n📊 Database Summary:');
    console.log(`   👥 Users: ${stats.userCount} (${stats.adminCount} admin, ${stats.regularUserCount} regular)`);
    console.log(`   📚 Modules: ${stats.moduleCount}`);
    console.log(`   📝 Questions: ${stats.questionCount} (${stats.releasedQuestionCount} released)`);
    console.log(`   🧩 Mini Questions: ${stats.miniQuestionCount} (${stats.releasedMiniQuestionCount} released)`);
    console.log(`   💬 Answers: ${stats.answerCount} (${stats.pendingAnswerCount} pending, ${stats.approvedAnswerCount} approved)`);
    console.log(`   🗨️  Mini Answers: ${stats.miniAnswerCount}`);

    console.log('\n📋 Demo Account Credentials:');
    console.log('┌─────────────────────────────────────────────┐');
    console.log('│                DEMO ACCOUNTS                │');
    console.log('├─────────────────────────────────────────────┤');
    console.log('│ Admin: admin@traintrails.com / admin123     │');
    console.log('│ User:  alice@traintrails.com / password123  │');
    console.log('│ User:  bob@traintrails.com / password123    │');
    console.log('│ User:  test@traintrails.com / test123       │');
    console.log('└─────────────────────────────────────────────┘');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function getStats() {
  const userCount = await prisma.user.count();
  const adminCount = await prisma.user.count({ where: { isAdmin: true } });
  const regularUserCount = await prisma.user.count({ where: { isAdmin: false } });
  const moduleCount = await prisma.module.count();
  const questionCount = await prisma.question.count();
  const releasedQuestionCount = await prisma.question.count({ where: { isReleased: true } });
  const miniQuestionCount = await prisma.miniQuestion.count();
  const releasedMiniQuestionCount = await prisma.miniQuestion.count({ where: { isReleased: true } });
  const answerCount = await prisma.answer.count();
  const pendingAnswerCount = await prisma.answer.count({ where: { status: 'PENDING' } });
  const approvedAnswerCount = await prisma.answer.count({ where: { status: 'APPROVED' } });
  const miniAnswerCount = await prisma.miniAnswer.count();

  return {
    userCount,
    adminCount,
    regularUserCount,
    moduleCount,
    questionCount,
    releasedQuestionCount,
    miniQuestionCount,
    releasedMiniQuestionCount,
    answerCount,
    pendingAnswerCount,
    approvedAnswerCount,
    miniAnswerCount
  };
}

// Run the seeding
seedDatabase()
  .then(() => {
    console.log('\n🏁 Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error during seeding:', error);
    process.exit(1);
  });
