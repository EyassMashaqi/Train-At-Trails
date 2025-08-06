import { PrismaClient } from '@prisma/client';

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
        title: "Zone 1",
        content: "Master the fundamentals of team dynamics and leadership zones.",
        description: "Understanding different leadership zones and their applications.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 2,
        title: "Zone 2",
        content: "Advance your understanding of leadership zones and team management.",
        description: "Deepening your knowledge of effective team leadership strategies.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 3,
        title: "Zone 3",
        content: "Master advanced leadership zone concepts and applications.",
        description: "Applying advanced leadership concepts in complex situations.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 4,
        title: "Presentation",
        content: "Present your understanding of leadership zones.",
        description: "Demonstrate your mastery of team leadership concepts.",
        points: 150,
        bonusPoints: 75
      },
      {
        topicNumber: 5,
        title: "Powerful Questions",
        content: "Learn to ask powerful questions that drive meaningful conversations.",
        description: "Develop the skill of asking questions that inspire and motivate.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 6,
        title: "Run Feedback 1:1s & Plan Completion",
        content: "Conduct effective one-on-one feedback sessions and complete planning cycles.",
        description: "Master the art of giving feedback and completing development plans.",
        points: 100,
        bonusPoints: 50
      }
    ]
  },
  {
    moduleNumber: 3,
    title: "Delegation & Performance Management",
    description: "Mastering delegation and performance management skills",
    topics: [
      {
        topicNumber: 1,
        title: "Practice Running 1:1",
        content: "Practice conducting effective one-on-one meetings with team members.",
        description: "Hands-on practice with structured one-on-one meeting frameworks.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 2,
        title: "Delegation Plan",
        content: "Create comprehensive delegation strategies and plans.",
        description: "Learn to create effective delegation plans that empower your team.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 3,
        title: "Task Delegation",
        content: "Master the practical aspects of delegating tasks effectively.",
        description: "Hands-on practice with delegating various types of tasks and responsibilities.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 4,
        title: "Performance Sheet",
        content: "Develop and implement performance tracking and evaluation systems.",
        description: "Create effective performance management tools and processes.",
        points: 150,
        bonusPoints: 75
      }
    ]
  },
  {
    moduleNumber: 4,
    title: "Mindset & Resilience",
    description: "Developing growth mindset and resilience in leadership",
    topics: [
      {
        topicNumber: 1,
        title: "Presentation - Mindset Shift",
        content: "Present your understanding of mindset shifts in leadership.",
        description: "Demonstrate how mindset changes can transform leadership effectiveness.",
        points: 150,
        bonusPoints: 75
      },
      {
        topicNumber: 2,
        title: "Energy Redirection",
        content: "Learn to redirect negative energy into positive outcomes.",
        description: "Master techniques for managing and redirecting energy in challenging situations.",
        points: 100,
        bonusPoints: 50
      },
      {
        topicNumber: 3,
        title: "Flip the Frame - Obstacle to Opportunity",
        content: "Transform obstacles into opportunities through reframing techniques.",
        description: "Develop the ability to see opportunities in every challenge.",
        points: 150,
        bonusPoints: 75
      }
    ]
  }
];

async function main() {
  console.log('Seeding modules and topics...');

  // Create or find default cohort
  const defaultCohort = await prisma.cohort.upsert({
    where: { name: 'Default Cohort' },
    update: {},
    create: {
      name: 'Default Cohort',
      description: 'Default cohort for new users and general training',
      startDate: new Date(),
      endDate: null,
      isActive: true
    }
  });

  console.log('🎯 Default cohort:', defaultCohort.name);

  // Calculate deadlines (each module released every 2 weeks, topics within module every 2 days)
  const gameStartDate = new Date('2025-08-01T00:00:00Z');
  
  for (const moduleData of modules) {
    // Module release date (every 2 weeks)
    const moduleReleaseDate = new Date(gameStartDate.getTime() + 
      (moduleData.moduleNumber - 1) * 14 * 24 * 60 * 60 * 1000);
    
    // Module deadline (2 weeks after release)
    const moduleDeadline = new Date(moduleReleaseDate.getTime() + 
      14 * 24 * 60 * 60 * 1000);

    console.log(`Creating Module ${moduleData.moduleNumber}: ${moduleData.title}`);
    
    // @ts-ignore - Prisma client types may not be updated yet, but runtime works
    const module = await prisma.module.create({
      data: {
        moduleNumber: moduleData.moduleNumber,
        title: moduleData.title,
        description: moduleData.description,
        isActive: true,
        isReleased: moduleData.moduleNumber === 1, // Only first module released initially
        releaseDate: moduleReleaseDate,
        cohortId: defaultCohort.id
      }
    });

    // Create topics for this module
    for (const topicData of moduleData.topics) {
      // Topic release date (every 2 days within module)
      const topicReleaseDate = new Date(moduleReleaseDate.getTime() + 
        (topicData.topicNumber - 1) * 2 * 24 * 60 * 60 * 1000);
      
      // Topic deadline (48 hours after release)
      const topicDeadline = new Date(topicReleaseDate.getTime() + 
        2 * 24 * 60 * 60 * 1000);

      console.log(`  Creating Topic ${topicData.topicNumber}: ${topicData.title}`);
      
      // @ts-ignore - Prisma client types may not be updated yet, but runtime works
      await prisma.topic.create({
        data: {
          moduleId: module.id,
          topicNumber: topicData.topicNumber,
          title: topicData.title,
          content: topicData.content,
          description: topicData.description,
          deadline: topicDeadline,
          points: topicData.points,
          bonusPoints: topicData.bonusPoints,
          isActive: true,
          isReleased: moduleData.moduleNumber === 1 && topicData.topicNumber === 1, // Only first topic released initially
          releaseDate: topicReleaseDate
        }
      });
    }
  }

  // Update game config for new structure
  await prisma.gameConfig.upsert({
    where: { id: 'singleton' },
    update: {
      totalQuestions: 17, // Total number of topics across all modules
      questionReleaseIntervalHours: 48
    },
    create: {
      id: 'singleton',
      totalQuestions: 17,
      questionReleaseIntervalHours: 48,
      gameStartDate: gameStartDate
    }
  });

  console.log('✅ Modules and topics seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding modules and topics:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
