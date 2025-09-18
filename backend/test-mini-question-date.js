const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMiniQuestionDateUpdate() {
  try {
    console.log('🧪 Testing mini question date update issues...\n');
    
    // Get a mini question to test with
    const miniQuestion = await prisma.miniQuestion.findFirst({
      include: {
        content: {
          include: {
            question: true
          }
        }
      }
    });
    
    if (!miniQuestion) {
      console.log('❌ No mini questions found to test');
      return;
    }
    
    console.log(`📝 Testing mini question: "${miniQuestion.title}"`);
    console.log(`   Current release date: ${miniQuestion.releaseDate}`);
    console.log(`   Question: "${miniQuestion.content.question.title}"`);
    
    // Test 1: Update with a specific datetime-local format (what frontend sends)
    const testDateTime = '2025-09-18T14:30';
    console.log(`\n🧪 Test 1: Updating with datetime-local format: "${testDateTime}"`);
    
    const result1 = await prisma.miniQuestion.update({
      where: { id: miniQuestion.id },
      data: {
        releaseDate: new Date(testDateTime)
      }
    });
    
    console.log(`✅ Updated release date: ${result1.releaseDate}`);
    console.log(`   Expected: ${new Date(testDateTime).toISOString()}`);
    console.log(`   Match: ${result1.releaseDate?.toISOString() === new Date(testDateTime).toISOString()}`);
    
    // Test 2: Update with ISO string format
    const testISODate = '2025-09-18T16:45:00.000Z';
    console.log(`\n🧪 Test 2: Updating with ISO format: "${testISODate}"`);
    
    const result2 = await prisma.miniQuestion.update({
      where: { id: miniQuestion.id },
      data: {
        releaseDate: new Date(testISODate)
      }
    });
    
    console.log(`✅ Updated release date: ${result2.releaseDate}`);
    console.log(`   Expected: ${testISODate}`);
    console.log(`   Match: ${result2.releaseDate?.toISOString() === testISODate}`);
    
    // Test 3: Test timezone handling
    console.log(`\n🧪 Test 3: Testing timezone conversion`);
    const localTime = '2025-09-18T10:00';
    const localDate = new Date(localTime);
    console.log(`   Local input: "${localTime}"`);
    console.log(`   JavaScript Date: ${localDate.toISOString()}`);
    console.log(`   Local string: ${localDate.toLocaleString()}`);
    
    const result3 = await prisma.miniQuestion.update({
      where: { id: miniQuestion.id },
      data: {
        releaseDate: localDate
      }
    });
    
    console.log(`✅ Stored in DB: ${result3.releaseDate}`);
    
    // Test 4: Verify what datetime-local should display
    console.log(`\n📅 Test 4: Datetime-local format conversion`);
    const dbDate = result3.releaseDate;
    if (dbDate) {
      // This is what the frontend should show in datetime-local input
      const year = dbDate.getFullYear();
      const month = String(dbDate.getMonth() + 1).padStart(2, '0');
      const day = String(dbDate.getDate()).padStart(2, '0');
      const hours = String(dbDate.getHours()).padStart(2, '0');
      const minutes = String(dbDate.getMinutes()).padStart(2, '0');
      const datetimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      console.log(`   DB date: ${dbDate.toISOString()}`);
      console.log(`   For datetime-local input: "${datetimeLocal}"`);
      console.log(`   Local display: ${dbDate.toLocaleString()}`);
    }
    
    // Test 5: Test null date handling
    console.log(`\n🧪 Test 5: Testing null date handling`);
    const result5 = await prisma.miniQuestion.update({
      where: { id: miniQuestion.id },
      data: {
        releaseDate: null
      }
    });
    
    console.log(`✅ Null date result: ${result5.releaseDate}`);
    
    // Restore original date
    if (miniQuestion.releaseDate) {
      await prisma.miniQuestion.update({
        where: { id: miniQuestion.id },
        data: {
          releaseDate: miniQuestion.releaseDate
        }
      });
      console.log(`✅ Restored original date: ${miniQuestion.releaseDate}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing mini question date update:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMiniQuestionDateUpdate();