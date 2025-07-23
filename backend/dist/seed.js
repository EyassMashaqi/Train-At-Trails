"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // Create game configuration
    const gameConfig = await prisma.gameConfig.upsert({
        where: { id: 'singleton' },
        update: {},
        create: {
            id: 'singleton',
            questionReleaseIntervalHours: parseInt(process.env.QUESTION_RELEASE_INTERVAL_HOURS || '48'),
            totalQuestions: 12,
            gameStartDate: new Date()
        }
    });
    console.log('📝 Game configuration created:', gameConfig);
    // Create admin user
    const adminPassword = await bcryptjs_1.default.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
    const adminUser = await prisma.user.upsert({
        where: { email: process.env.ADMIN_EMAIL || 'admin@trainattrails.com' },
        update: {},
        create: {
            email: process.env.ADMIN_EMAIL || 'admin@trainattrails.com',
            password: adminPassword,
            fullName: 'Admin User',
            trainName: 'Admin Express',
            isAdmin: true
        }
    });
    console.log('👑 Admin user created:', { email: adminUser.email, isAdmin: adminUser.isAdmin });
    // Create sample questions
    const questions = [
        {
            questionNumber: 1,
            title: "Welcome Aboard!",
            content: "Welcome to Train at Trails! This is your first challenge. Tell us about yourself and why you're excited to be part of this journey. What do you hope to achieve through this experience?"
        },
        {
            questionNumber: 2,
            title: "Your Learning Goals",
            content: "What are three specific skills or areas of knowledge you want to develop during this program? How do these align with your personal or professional goals?"
        },
        {
            questionNumber: 3,
            title: "Problem-Solving Approach",
            content: "Describe a challenging problem you've faced recently and how you approached solving it. What steps did you take, and what did you learn from the experience?"
        },
        {
            questionNumber: 4,
            title: "Collaboration and Teamwork",
            content: "Share an example of a successful collaboration or team project you've been part of. What made it successful, and what role did you play in achieving the team's goals?"
        },
        {
            questionNumber: 5,
            title: "Innovation and Creativity",
            content: "Describe a time when you had to think creatively or come up with an innovative solution. What was the situation, and how did your creative approach make a difference?"
        },
        {
            questionNumber: 6,
            title: "Overcoming Challenges",
            content: "Tell us about a significant obstacle you've overcome. What strategies did you use to persist through difficulties, and how did this experience shape you?"
        },
        {
            questionNumber: 7,
            title: "Leadership and Initiative",
            content: "Describe a situation where you took initiative or demonstrated leadership, even if you weren't in a formal leadership role. What motivated you to step up, and what was the outcome?"
        },
        {
            questionNumber: 8,
            title: "Continuous Learning",
            content: "How do you stay current with trends and developments in your field of interest? Describe your approach to lifelong learning and give a specific example of something new you've learned recently."
        },
        {
            questionNumber: 9,
            title: "Impact and Contribution",
            content: "Describe a project or activity where you made a meaningful contribution or impact. How did you measure success, and what feedback did you receive about your contribution?"
        },
        {
            questionNumber: 10,
            title: "Future Vision",
            content: "Where do you see yourself in 2-3 years? What steps are you taking now to work toward that vision, and how does this program fit into your journey?"
        },
        {
            questionNumber: 11,
            title: "Reflection and Growth",
            content: "Looking back at your journey through this program so far, what has been your most significant learning or insight? How has it changed your perspective or approach to challenges?"
        },
        {
            questionNumber: 12,
            title: "Final Challenge",
            content: "Congratulations on reaching the final station! Describe how you would apply everything you've learned in this program to mentor someone else who is just starting their journey. What advice would you give them?"
        }
    ];
    for (const questionData of questions) {
        const question = await prisma.question.upsert({
            where: { questionNumber: questionData.questionNumber },
            update: {
                title: questionData.title,
                content: questionData.content
            },
            create: questionData
        });
        console.log(`📋 Question ${question.questionNumber} created: ${question.title}`);
    }
    // Create a few sample users for testing
    const sampleUsers = [
        {
            email: 'alice@example.com',
            fullName: 'Alice Johnson',
            trainName: 'Lightning Express'
        },
        {
            email: 'bob@example.com',
            fullName: 'Bob Smith',
            trainName: 'Thunder Bolt'
        },
        {
            email: 'carol@example.com',
            fullName: 'Carol Davis',
            trainName: 'Star Cruiser'
        }
    ];
    for (const userData of sampleUsers) {
        const hashedPassword = await bcryptjs_1.default.hash('password123', 12);
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: {
                ...userData,
                password: hashedPassword
            }
        });
        console.log(`👤 Sample user created: ${user.email}`);
    }
    console.log('✅ Database seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map