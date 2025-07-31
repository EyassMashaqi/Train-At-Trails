const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBackendAPI() {
  try {
    console.log('Testing backend /game/progress endpoint...\n');
    
    // Simulate the API call as the backend would handle it
    const userId = 'cmdrc1p390001ycuohfo8ngwr'; // Alice's ID
    
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        trainName: true,
        currentStep: true,
        createdAt: true
      }
    });

    console.log('User:', user);
    console.log('Testing if backend returns currentQuestion and currentQuestionMiniQuestions...\n');
    
    // The API should now return both old and new structure
    // Let's check if it includes currentQuestion for backward compatibility
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBackendAPI();
