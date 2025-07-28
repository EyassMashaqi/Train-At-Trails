-- AlterTable
ALTER TABLE "answers" ADD COLUMN "attachmentFileName" TEXT;
ALTER TABLE "answers" ADD COLUMN "attachmentFilePath" TEXT;
ALTER TABLE "answers" ADD COLUMN "attachmentFileSize" INTEGER;
ALTER TABLE "answers" ADD COLUMN "attachmentMimeType" TEXT;
