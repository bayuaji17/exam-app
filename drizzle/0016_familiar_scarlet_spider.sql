CREATE TABLE "attempt_session_transfer" (
	"id" text PRIMARY KEY NOT NULL,
	"attemptId" text NOT NULL,
	"participantId" text NOT NULL,
	"previousSessionId" text,
	"newSessionId" text NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"reason" text DEFAULT 'crash_recovery_token_reverified' NOT NULL,
	"transferredAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempt" ADD COLUMN "startedSessionId" text;--> statement-breakpoint
ALTER TABLE "attempt" ADD COLUMN "submissionType" text;--> statement-breakpoint
ALTER TABLE "exam_schedule" ADD COLUMN "token" text;--> statement-breakpoint
ALTER TABLE "attempt_session_transfer" ADD CONSTRAINT "attempt_session_transfer_attemptId_attempt_id_fk" FOREIGN KEY ("attemptId") REFERENCES "public"."attempt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_session_transfer" ADD CONSTRAINT "attempt_session_transfer_participantId_user_id_fk" FOREIGN KEY ("participantId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempt_session_transfer_attemptId_idx" ON "attempt_session_transfer" USING btree ("attemptId");--> statement-breakpoint
CREATE INDEX "attempt_session_transfer_participantId_idx" ON "attempt_session_transfer" USING btree ("participantId");--> statement-breakpoint
CREATE INDEX "attempt_session_transfer_transferredAt_idx" ON "attempt_session_transfer" USING btree ("transferredAt");--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_participant_open_uidx" ON "attempt" USING btree ("participantId") WHERE "submittedAt" IS NULL;