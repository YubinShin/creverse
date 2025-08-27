/*
  Warnings:

  - You are about to drop the column `uri` on the `submission_media` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."submission_media" DROP COLUMN "uri",
ADD COLUMN     "blob_url" TEXT,
ADD COLUMN     "local_path" TEXT;
