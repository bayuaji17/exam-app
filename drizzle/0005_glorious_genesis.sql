CREATE TABLE "exam_package" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"durationMinutes" integer,
	"shuffle" boolean DEFAULT false NOT NULL,
	"passScore" numeric(8, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_question" (
	"id" text PRIMARY KEY NOT NULL,
	"examId" text NOT NULL,
	"questionId" text NOT NULL,
	"position" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_question" ADD CONSTRAINT "exam_question_examId_exam_package_id_fk" FOREIGN KEY ("examId") REFERENCES "public"."exam_package"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_question" ADD CONSTRAINT "exam_question_questionId_question_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."question"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_package_name_idx" ON "exam_package" USING btree ("name");--> statement-breakpoint
CREATE INDEX "exam_question_examId_idx" ON "exam_question" USING btree ("examId");--> statement-breakpoint
CREATE INDEX "exam_question_questionId_idx" ON "exam_question" USING btree ("questionId");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_question_examId_questionId_idx" ON "exam_question" USING btree ("examId","questionId");