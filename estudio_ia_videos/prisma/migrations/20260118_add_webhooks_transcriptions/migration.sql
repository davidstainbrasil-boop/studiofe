-- CreateTable
CREATE TABLE "public"."webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "retry_interval" INTEGER,
    "total_deliveries" INTEGER NOT NULL DEFAULT 0,
    "successful_deliveries" INTEGER NOT NULL DEFAULT 0,
    "failed_deliveries" INTEGER NOT NULL DEFAULT 0,
    "last_delivery_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "webhooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "public"."webhook_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhook_id" UUID NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "url" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "response_code" INTEGER,
    "response_body" TEXT,
    "response_time" INTEGER,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "scheduled_for" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "next_retry_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "webhook_deliveries_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "public"."transcriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "project_id" UUID,
    "audio_path" TEXT,
    "language" VARCHAR(20) NOT NULL,
    "duration" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "word_count" INTEGER,
    "segments" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "karaoke_enabled" BOOLEAN NOT NULL DEFAULT false,
    "speaker_diarization_enabled" BOOLEAN NOT NULL DEFAULT false,
    "srt_url" TEXT,
    "vtt_url" TEXT,
    "karaoke_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "transcriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transcriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "transcriptions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "public"."subtitle_tracks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transcription_id" UUID NOT NULL,
    "language" VARCHAR(20) NOT NULL,
    "segments" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "srt_url" TEXT,
    "vtt_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "subtitle_tracks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subtitle_tracks_transcription_id_fkey" FOREIGN KEY ("transcription_id") REFERENCES "public"."transcriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- Indexes
CREATE INDEX "idx_webhooks_user_id" ON "public"."webhooks" ("user_id");
CREATE INDEX "idx_webhooks_active" ON "public"."webhooks" ("active");
CREATE INDEX "idx_webhook_deliveries_webhook_id" ON "public"."webhook_deliveries" ("webhook_id");
CREATE INDEX "idx_webhook_deliveries_status" ON "public"."webhook_deliveries" ("status");
CREATE INDEX "idx_transcriptions_user_id" ON "public"."transcriptions" ("user_id");
CREATE INDEX "idx_transcriptions_project_id" ON "public"."transcriptions" ("project_id");
CREATE INDEX "idx_subtitle_tracks_transcription_id" ON "public"."subtitle_tracks" ("transcription_id");
