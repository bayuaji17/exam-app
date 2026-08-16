CREATE TABLE "attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"scheduleId" text NOT NULL,
	"participantId" text NOT NULL,
	"startedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deadlineAt" timestamp with time zone,
	"submittedAt" timestamp with time zone,
	"questionOrder" jsonb NOT NULL,
	"score" numeric(8, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempt_answer" (
	"id" text PRIMARY KEY NOT NULL,
	"attemptId" text NOT NULL,
	"questionId" text NOT NULL,
	"answer" jsonb NOT NULL,
	"autoScore" numeric(8, 2),
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_schedule" ADD COLUMN "attemptLimit" integer;--> statement-breakpoint
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_scheduleId_exam_schedule_id_fk" FOREIGN KEY ("scheduleId") REFERENCES "public"."exam_schedule"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt" ADD CONSTRAINT "attempt_participantId_user_id_fk" FOREIGN KEY ("participantId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_answer" ADD CONSTRAINT "attempt_answer_attemptId_attempt_id_fk" FOREIGN KEY ("attemptId") REFERENCES "public"."attempt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_answer" ADD CONSTRAINT "attempt_answer_questionId_question_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."question"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempt_scheduleId_idx" ON "attempt" USING btree ("scheduleId");--> statement-breakpoint
CREATE INDEX "attempt_participantId_idx" ON "attempt" USING btree ("participantId");--> statement-breakpoint
CREATE INDEX "attempt_scheduleId_participantId_idx" ON "attempt" USING btree ("scheduleId","participantId");--> statement-breakpoint
CREATE INDEX "attempt_answer_attemptId_idx" ON "attempt_answer" USING btree ("attemptId");--> statement-breakpoint
CREATE INDEX "attempt_answer_questionId_idx" ON "attempt_answer" USING btree ("questionId");--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_answer_attemptId_questionId_idx" ON "attempt_answer" USING btree ("attemptId","questionId");