CREATE TABLE "question_media" (
	"id" text PRIMARY KEY NOT NULL,
	"questionId" text,
	"objectKey" text NOT NULL,
	"mime" text NOT NULL,
	"sizeBytes" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	CONSTRAINT "question_media_objectKey_unique" UNIQUE("objectKey")
);
--> statement-breakpoint
ALTER TABLE "question_media" ADD CONSTRAINT "question_media_questionId_question_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."question"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "question_media_questionId_idx" ON "question_media" USING btree ("questionId");--> statement-breakpoint
CREATE INDEX "question_media_deletedAt_idx" ON "question_media" USING btree ("deletedAt");