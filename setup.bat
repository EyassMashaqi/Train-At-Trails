@echo off
echo ========================================
echo BVisionRY Lighthouse - Setup Script
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found: 
node --version

echo.
echo Installing dependencies...
echo ========================================

echo Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install root dependencies
    pause
    exit /b 1
)

echo.
echo Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo Installing backend dependencies...
cd ..\backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo Setting up database...
echo ========================================

echo Generating Prisma client...
call npm run db:generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate Prisma client
    pause
    exit /b 1
)

echo Running database migrations...
call npm run db:migrate
if %errorlevel% neq 0 (
    echo ERROR: Failed to run database migrations
    pause
    exit /b 1
)

echo Seeding database...
call npm run db:seed
if %errorlevel% neq 0 (
    echo WARNING: Failed to seed database (this may be normal if already seeded)
)

cd ..

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo To start the development servers, run:
echo   npm run dev
echo.
echo Frontend will be available at: http://localhost:5173
echo Backend API will be available at: http://localhost:3000
echo.
echo Make sure to create .env files as described in REQUIREMENTS.md
echo.
pause
