ALTER TABLE "attempt_answer" ADD COLUMN "manualScore" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "attempt_answer" ADD COLUMN "gradedBy" text;--> statement-breakpoint
ALTER TABLE "attempt_answer" ADD COLUMN "gradedAt" timestamp;--> statement-breakpoint
ALTER TABLE "attempt_answer" ADD CONSTRAINT "attempt_answer_gradedBy_user_id_fk" FOREIGN KEY ("gradedBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;