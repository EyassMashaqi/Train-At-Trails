#!/bin/bash

# Quick Start Script for User Status Email Templates
# This script adds the new user status email templates to the BVisionRY Lighthouse system

echo "🚀 Quick Start: Adding User Status Email Templates"
echo "=================================================="

# Change to backend directory
cd "$(dirname "$0")/backend"

echo "📂 Working directory: $(pwd)"

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: Not in the correct backend directory"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "1️⃣ Generating Prisma client..."
npx prisma generate

echo "2️⃣ Applying database migrations..."
npx prisma migrate deploy

echo "3️⃣ Seeding user status email templates..."
npx ts-node seed-user-status-email-templates.ts

echo "✅ Setup complete!"
echo ""
echo "📧 New email templates added:"
echo "   - User Assigned to Cohort"
echo "   - User Graduated"
echo "   - User Removed from Cohort"
echo "   - User Suspended"
echo ""
echo "🎯 New API endpoints available:"
echo "   - PATCH /api/cohorts/:cohortId/members/:userId/suspend"
echo "   - PATCH /api/cohorts/:cohortId/members/:userId/graduate"
echo "   - PATCH /api/cohorts/:cohortId/members/:userId/reactivate"
echo ""
echo "🔥 Ready to use! Start your development servers with 'npm run dev'"
