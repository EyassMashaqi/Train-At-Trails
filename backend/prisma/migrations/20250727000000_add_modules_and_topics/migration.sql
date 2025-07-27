-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isReleased" BOOLEAN NOT NULL DEFAULT false,
    "releaseDate" DATETIME,
    "deadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topicNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deadline" DATETIME NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 100,
    "bonusPoints" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isReleased" BOOLEAN NOT NULL DEFAULT false,
    "releaseDate" DATETIME,
    "releasedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "moduleId" TEXT NOT NULL,
    CONSTRAINT "topics_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "currentModule" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "currentTopic" INTEGER NOT NULL DEFAULT 0;

-- AlterTable  
ALTER TABLE "answers" ADD COLUMN "topicId" TEXT;
ALTER TABLE "answers" ADD CONSTRAINT "answers_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Make questionId optional in answers table
-- Note: SQLite doesn't support dropping NOT NULL constraints directly, 
-- so we'll handle this in the application logic for now

-- CreateIndex
CREATE UNIQUE INDEX "modules_moduleNumber_key" ON "modules"("moduleNumber");
CREATE UNIQUE INDEX "topics_moduleId_topicNumber_key" ON "topics"("moduleId", "topicNumber");
