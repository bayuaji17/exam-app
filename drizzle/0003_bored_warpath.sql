CREATE TYPE "public"."question_type" AS ENUM('single', 'scored', 'manual');--> statement-breakpoint
CREATE TABLE "question" (
	"id" text PRIMARY KEY NOT NULL,
	"bankId" text NOT NULL,
	"type" "question_type" NOT NULL,
	"content" jsonb NOT NULL,
	"searchText" text NOT NULL,
	"categoryId" text,
	"archivedAt" timestamp,
	"archivedWithBankAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_option" (
	"id" text PRIMARY KEY NOT NULL,
	"questionId" text NOT NULL,
	"content" jsonb NOT NULL,
	"position" integer NOT NULL,
	"isCorrect" boolean,
	"score" numeric(8, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_bankId_question_bank_id_fk" FOREIGN KEY ("bankId") REFERENCES "public"."question_bank"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_categoryId_question_category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."question_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_option" ADD CONSTRAINT "question_option_questionId_question_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "question_bankId_idx" ON "question" USING btree ("bankId");--> statement-breakpoint
CREATE INDEX "question_bankId_archivedAt_idx" ON "question" USING btree ("bankId","archivedAt");--> statement-breakpoint
CREATE INDEX "question_categoryId_idx" ON "question" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "question_searchText_idx" ON "question" USING btree ("searchText");--> statement-breakpoint
CREATE INDEX "question_category_lower_name_idx" ON "question_category" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "question_option_questionId_idx" ON "question_option" USING btree ("questionId");--> statement-breakpoint
CREATE INDEX "question_option_position_idx" ON "question_option" USING btree ("questionId","position");