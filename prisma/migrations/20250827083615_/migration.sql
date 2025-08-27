/*
  Warnings:

  - A unique constraint covering the columns `[submission_id,media_type]` on the table `submission_media` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "submission_media_submission_id_media_type_key" ON "public"."submission_media"("submission_id", "media_type");
