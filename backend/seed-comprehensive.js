const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
        content: "Learn to build effective teams and understand team dynamics.",
        description: "Master the art of creating high-performing teams.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 2,
        title: "Communication Excellence",
        content: "Develop advanced communication skills for leadership.",
        description: "Master verbal and non-verbal communication techniques.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 3,
        title: "Conflict Resolution",
        content: "Learn to manage and resolve conflicts effectively.",
        description: "Develop skills to handle workplace conflicts constructively.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 4,
        title: "Team Leadership Project",
        content: "Apply your team leadership skills in a practical project.",
        description: "Lead a team project to demonstrate your leadership capabilities.",
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
        content: "Develop strategic thinking and planning capabilities.",
        description: "Learn to think strategically and plan for long-term success.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 2,
        title: "Innovation Leadership",
        content: "Lead innovation initiatives and foster creative thinking.",
        description: "Develop skills to lead innovation and drive change.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 3,
        title: "Change Management",
        content: "Master the art of leading organizational change.",
        description: "Learn to manage and lead change initiatives effectively.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 4,
        title: "Capstone Leadership Project",
        content: "Complete a comprehensive leadership project.",
        description: "Demonstrate all your leadership skills in a final project.",
        points: 200,
        bonusPoints: 100
      }
    ]
  }
];

async function seedDetailedData() {
  try {
    console.log('🌱 Starting detailed data seeding...');

    // Clear existing data first
    await prisma.answer.deleteMany();
    await prisma.miniAnswer.deleteMany();
    await prisma.miniQuestion.deleteMany();
    await prisma.content.deleteMany();
    await prisma.question.deleteMany();
    await prisma.module.deleteMany();

    let questionNumber = 1;
    const baseDeadline = new Date();
    baseDeadline.setMonth(baseDeadline.getMonth() + 2); // 2 months from now

    for (const moduleData of modules) {
      console.log(`📚 Creating module: ${moduleData.title}`);
      
      const module = await prisma.module.create({
        data: {
          moduleNumber: moduleData.moduleNumber,
          title: moduleData.title,
          description: moduleData.description,
          isActive: moduleData.moduleNumber === 1, // Make first module active
          isReleased: moduleData.moduleNumber === 1 // Make first module released
        }
      });

      // Create questions (topics) for this module
      for (const topicData of moduleData.topics) {
        const topicDeadline = new Date(baseDeadline);
        topicDeadline.setDate(topicDeadline.getDate() + (questionNumber * 14)); // 2 weeks apart

        console.log(`  📝 Creating question: ${topicData.title}`);
        
        const question = await prisma.question.create({
          data: {
            questionNumber: questionNumber,
            title: topicData.title,
            content: topicData.content,
            description: topicData.description,
            deadline: topicDeadline,
            points: topicData.points,
            bonusPoints: topicData.bonusPoints,
            isReleased: questionNumber <= 2, // Release first 2 questions
            isActive: questionNumber <= 2,
            moduleId: module.id,
            topicNumber: topicData.topicNumber,
            releaseDate: questionNumber <= 2 ? new Date() : null
          }
        });

        // Create sample content sections with mini questions for some questions
        if (questionNumber <= 3) {
          console.log(`    📄 Adding content sections for: ${topicData.title}`);
          
          const content1 = await prisma.content.create({
            data: {
              title: "Learning Material",
              material: `Study material for ${topicData.title}. This includes key concepts, frameworks, and practical examples.`,
              orderIndex: 1,
              questionId: question.id
            }
          });

          const content2 = await prisma.content.create({
            data: {
              title: "Interactive Exercises",
              material: `Interactive exercises and activities to reinforce learning in ${topicData.title}.`,
              orderIndex: 2,
              questionId: question.id
            }
          });

          // Add mini questions
          const miniQuestions = [
            {
              title: "Research Task",
              question: `Research and share a link to an article or resource related to ${topicData.title}`,
              description: "Find a quality resource that enhances understanding of this topic",
              contentId: content1.id,
              orderIndex: 1,
              releaseDate: new Date(Date.now() + (questionNumber * 24 * 60 * 60 * 1000)), // Release 1 day per question number
              isReleased: questionNumber === 1 // Only release for first question
            },
            {
              title: "Case Study Analysis",
              question: `Find and analyze a case study related to ${topicData.title}`,
              description: "Share a link to a relevant case study and provide your analysis",
              contentId: content1.id,
              orderIndex: 2,
              releaseDate: new Date(Date.now() + ((questionNumber + 1) * 24 * 60 * 60 * 1000)),
              isReleased: false
            },
            {
              title: "Practical Application",
              question: `Create or find an example of practical application of ${topicData.title} concepts`,
              description: "Share a link or create content showing real-world application",
              contentId: content2.id,
              orderIndex: 1,
              releaseDate: new Date(Date.now() + ((questionNumber + 2) * 24 * 60 * 60 * 1000)),
              isReleased: false
            }
          ];

          for (const mqData of miniQuestions) {
            await prisma.miniQuestion.create({
              data: mqData
            });
          }

          console.log(`    🎯 Added ${miniQuestions.length} mini questions`);
        }

        questionNumber++;
      }

      console.log(`✅ Module ${moduleData.title} created with ${moduleData.topics.length} questions\n`);
    }

    // Create some sample answers for demonstration
    const users = await prisma.user.findMany({ where: { isAdmin: false } });
    const releasedQuestions = await prisma.question.findMany({ where: { isReleased: true } });

    if (users.length > 0 && releasedQuestions.length > 0) {
      console.log('📝 Creating sample answers...');
      
      for (let i = 0; i < Math.min(users.length, 2); i++) {
        const user = users[i];
        const question = releasedQuestions[0]; // First released question
        
        await prisma.answer.create({
          data: {
            content: `This is a sample answer from ${user.fullName} for ${question.title}. The answer demonstrates understanding of the concepts and provides detailed explanations.`,
            status: i === 0 ? 'APPROVED' : 'PENDING',
            feedback: i === 0 ? 'Excellent work! Shows deep understanding.' : null,
            userId: user.id,
            questionId: question.id
          }
        });

        // Create sample mini answers
        const miniQuestions = await prisma.miniQuestion.findMany({
          where: { isReleased: true }
        });

        for (const mq of miniQuestions.slice(0, 2)) {
          await prisma.miniAnswer.create({
            data: {
              linkUrl: `https://example.com/resource-${user.fullName.toLowerCase().replace(' ', '-')}-${mq.id}`,
              notes: `Sample notes from ${user.fullName} for ${mq.title}`,
              userId: user.id,
              miniQuestionId: mq.id
            }
          });
        }
      }
    }

    console.log('🎉 Detailed data seeding completed successfully!');
    
    // Final verification
    const finalStats = {
      modules: await prisma.module.count(),
      questions: await prisma.question.count(),
      contents: await prisma.content.count(),
      miniQuestions: await prisma.miniQuestion.count(),
      users: await prisma.user.count(),
      answers: await prisma.answer.count(),
      miniAnswers: await prisma.miniAnswer.count()
    };

    console.log('\n📊 Final Database Stats:');
    console.log(`   Modules: ${finalStats.modules}`);
    console.log(`   Questions: ${finalStats.questions}`);
    console.log(`   Content Sections: ${finalStats.contents}`);
    console.log(`   Mini Questions: ${finalStats.miniQuestions}`);
    console.log(`   Users: ${finalStats.users}`);
    console.log(`   Answers: ${finalStats.answers}`);
    console.log(`   Mini Answers: ${finalStats.miniAnswers}`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDetailedData();
