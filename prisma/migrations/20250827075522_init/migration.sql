/*
  Warnings:

  - You are about to drop the `http_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `revision` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `submission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `submission_log` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."revision" DROP CONSTRAINT "revision_submission_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."submission" DROP CONSTRAINT "submission_student_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."submission_log" DROP CONSTRAINT "submission_log_submission_id_fkey";

-- DropTable
DROP TABLE "public"."http_log";

-- DropTable
DROP TABLE "public"."revision";

-- DropTable
DROP TABLE "public"."student";

-- DropTable
DROP TABLE "public"."submission";

-- DropTable
DROP TABLE "public"."submission_log";

-- CreateTable
CREATE TABLE "public"."students" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."submissions" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "component_type" TEXT NOT NULL,
    "submit_text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "feedback" TEXT,
    "result_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."submission_media" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "media_type" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."submission_logs" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trace_id" TEXT,
    "latency_ms" INTEGER,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."revisions" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "prev_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "result_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stats_daily" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "total" INTEGER NOT NULL,
    "success" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "avg_latency" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stats_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stats_weekly" (
    "id" SERIAL NOT NULL,
    "week" TIMESTAMP(3) NOT NULL,
    "total" INTEGER NOT NULL,
    "success" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "avg_latency" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stats_weekly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stats_monthly" (
    "id" SERIAL NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "total" INTEGER NOT NULL,
    "success" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "avg_latency" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stats_monthly_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."submissions" ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."submission_media" ADD CONSTRAINT "submission_media_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."submission_logs" ADD CONSTRAINT "submission_logs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."revisions" ADD CONSTRAINT "revisions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
