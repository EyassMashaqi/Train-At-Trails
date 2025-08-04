-- CreateTable
CREATE TABLE "cohorts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cohort_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "cohort_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cohort_members_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cohort_game_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohortId" TEXT NOT NULL,
    "questionReleaseIntervalHours" INTEGER NOT NULL DEFAULT 48,
    "totalQuestions" INTEGER NOT NULL DEFAULT 12,
    "gameStartDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cohort_game_configs_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add cohortId to existing tables
ALTER TABLE "modules" ADD COLUMN "cohortId" TEXT;
ALTER TABLE "questions" ADD COLUMN "cohortId" TEXT;
ALTER TABLE "answers" ADD COLUMN "cohortId" TEXT;
ALTER TABLE "mini_answers" ADD COLUMN "cohortId" TEXT;

-- Create a default cohort for existing data
INSERT INTO "cohorts" ("id", "name", "description", "startDate", "isActive", "createdAt", "updatedAt")
VALUES ('default-cohort', 'Default Cohort', 'Default cohort for existing data', CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Create default cohort game config
INSERT INTO "cohort_game_configs" ("id", "cohortId", "questionReleaseIntervalHours", "totalQuestions", "gameStartDate", "updatedAt")
VALUES ('default-config', 'default-cohort', 48, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Update existing data to belong to default cohort
UPDATE "modules" SET "cohortId" = 'default-cohort' WHERE "cohortId" IS NULL;
UPDATE "questions" SET "cohortId" = 'default-cohort' WHERE "cohortId" IS NULL;
UPDATE "answers" SET "cohortId" = 'default-cohort' WHERE "cohortId" IS NULL;
UPDATE "mini_answers" SET "cohortId" = 'default-cohort' WHERE "cohortId" IS NULL;

-- Add all existing users to default cohort with their current progress
INSERT INTO "cohort_members" ("id", "userId", "cohortId", "currentStep", "joinedAt", "isActive")
SELECT 
    'member-' || "id",
    "id",
    'default-cohort',
    "currentStep",
    "createdAt",
    true
FROM "users"
WHERE NOT EXISTS (
    SELECT 1 FROM "cohort_members" WHERE "userId" = "users"."id" AND "cohortId" = 'default-cohort'
);

-- Make cohortId required (NOT NULL) after data migration
-- Note: SQLite doesn't support ALTER COLUMN directly, so we'll handle this in the Prisma migration

-- Create unique indexes
CREATE UNIQUE INDEX "cohorts_name_key" ON "cohorts"("name");
CREATE UNIQUE INDEX "cohort_members_userId_cohortId_key" ON "cohort_members"("userId", "cohortId");
CREATE UNIQUE INDEX "cohort_game_configs_cohortId_key" ON "cohort_game_configs"("cohortId");

-- Drop old unique constraints and create new ones with cohortId
-- For modules: moduleNumber should be unique within cohort
-- For questions: questionNumber should be unique within cohort
-- For answers: userId + questionId + cohortId should be unique
-- For mini_answers: userId + miniQuestionId + cohortId should be unique

-- Note: SQLite constraint modifications are limited, so we'll handle these in application logic initially
