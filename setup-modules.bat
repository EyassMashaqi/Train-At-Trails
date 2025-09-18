@echo off
echo 🚂 BVisionRY Lighthouse - Module System Setup
echo ========================================

cd backend

echo 📦 Installing dependencies...
call npm install

echo 🗄️ Running database migration...
call npx prisma migrate dev --name add_modules_and_topics

echo 🌱 Seeding modules and topics...
call npx ts-node prisma/seed-modules.ts

echo 🔄 Generating Prisma client...
call npx prisma generate

echo ✅ Module system setup complete!
echo.
echo 📚 Module Structure:
echo   - Module 1: Leadership Foundation (4 topics)
echo   - Module 2: Team Leadership ^& Communication (6 topics)  
echo   - Module 3: Delegation ^& Performance Management (4 topics)
echo   - Module 4: Mindset ^& Resilience (3 topics)
echo.
echo 🚀 You can now start the development server with: npm run dev

pause
