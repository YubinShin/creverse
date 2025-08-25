-- CreateTable
CREATE TABLE "public"."student" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."submission" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "component_type" TEXT NOT NULL,
    "submit_text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "score" INTEGER,
    "feedback" TEXT,
    "highlights" TEXT,
    "highlight_submit_text" TEXT,
    "video_path" TEXT,
    "audio_path" TEXT,
    "api_latency" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."submission_log" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "trace_id" TEXT,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."revision" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "prev_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."submission" ADD CONSTRAINT "submission_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."submission_log" ADD CONSTRAINT "submission_log_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."revision" ADD CONSTRAINT "revision_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
