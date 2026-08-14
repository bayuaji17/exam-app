CREATE TABLE "question_bank" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"archivedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "question_bank_archivedAt_idx" ON "question_bank" USING btree ("archivedAt");--> statement-breakpoint
CREATE INDEX "question_bank_createdBy_idx" ON "question_bank" USING btree ("createdBy");