#!/bin/bash

echo "========================================"
echo "BVisionRY Lighthouse - Setup Script"
echo "========================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo "Node.js found: $(node --version)"

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js version 18 or higher is required"
    echo "Current version: $(node --version)"
    exit 1
fi

echo
echo "Installing dependencies..."
echo "========================================"

echo "Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install root dependencies"
    exit 1
fi

echo
echo "Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install frontend dependencies"
    exit 1
fi

echo
echo "Installing backend dependencies..."
cd ../backend
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install backend dependencies"
    exit 1
fi

echo
echo "Setting up database..."
echo "========================================"

echo "Generating Prisma client..."
npm run db:generate
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to generate Prisma client"
    exit 1
fi

echo "Running database migrations..."
npm run db:migrate
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to run database migrations"
    exit 1
fi

echo "Seeding database..."
npm run db:seed
if [ $? -ne 0 ]; then
    echo "WARNING: Failed to seed database (this may be normal if already seeded)"
fi

cd ..

echo
echo "========================================"
echo "Setup completed successfully!"
echo "========================================"
echo
echo "To start the development servers, run:"
echo "  npm run dev"
echo
echo "Frontend will be available at: http://localhost:5173"
echo "Backend API will be available at: http://localhost:3000"
echo
echo "Make sure to create .env files as described in REQUIREMENTS.md"
echo
