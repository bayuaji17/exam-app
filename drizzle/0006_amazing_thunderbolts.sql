CREATE TABLE "exam_schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"packageId" text NOT NULL,
	"startsAt" timestamp with time zone NOT NULL,
	"endsAt" timestamp with time zone NOT NULL,
	"durationMinutes" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_schedule" ADD CONSTRAINT "exam_schedule_packageId_exam_package_id_fk" FOREIGN KEY ("packageId") REFERENCES "public"."exam_package"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_schedule_packageId_idx" ON "exam_schedule" USING btree ("packageId");--> statement-breakpoint
CREATE INDEX "exam_schedule_startsAt_idx" ON "exam_schedule" USING btree ("startsAt");