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
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."submission_media" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "media_type" TEXT NOT NULL,
    "local_path" TEXT,
    "blob_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."submission_logs" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "uri" TEXT,
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

-- CreateIndex
CREATE UNIQUE INDEX "submission_media_submission_id_media_type_key" ON "public"."submission_media"("submission_id", "media_type");

-- AddForeignKey
ALTER TABLE "public"."submissions" ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."submission_media" ADD CONSTRAINT "submission_media_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."submission_logs" ADD CONSTRAINT "submission_logs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."revisions" ADD CONSTRAINT "revisions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
