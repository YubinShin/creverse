/*
  Warnings:

  - Added the required column `last_error` to the `submissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."submissions" ADD COLUMN     "last_error" TEXT NOT NULL;
