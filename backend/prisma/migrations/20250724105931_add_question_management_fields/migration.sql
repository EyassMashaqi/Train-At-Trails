/*
  Warnings:

  - Added the required column `deadline` to the `questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `questions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "answers_userId_questionId_key";

-- AlterTable
ALTER TABLE "answers" ADD COLUMN "pointsAwarded" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionNumber" INTEGER NOT NULL,
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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_questions" ("content", "createdAt", "id", "isActive", "questionNumber", "releaseDate", "title", "updatedAt") SELECT "content", "createdAt", "id", "isActive", "questionNumber", "releaseDate", "title", "updatedAt" FROM "questions";
DROP TABLE "questions";
ALTER TABLE "new_questions" RENAME TO "questions";
CREATE UNIQUE INDEX "questions_questionNumber_key" ON "questions"("questionNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
