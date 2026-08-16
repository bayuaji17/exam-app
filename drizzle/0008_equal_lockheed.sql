CREATE TABLE "participant_group" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant_group_member" (
	"id" text PRIMARY KEY NOT NULL,
	"groupId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_group_eligibility" (
	"id" text PRIMARY KEY NOT NULL,
	"scheduleId" text NOT NULL,
	"groupId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_user_eligibility" (
	"id" text PRIMARY KEY NOT NULL,
	"scheduleId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participant_group_member" ADD CONSTRAINT "participant_group_member_groupId_participant_group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."participant_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_group_member" ADD CONSTRAINT "participant_group_member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_group_eligibility" ADD CONSTRAINT "schedule_group_eligibility_scheduleId_exam_schedule_id_fk" FOREIGN KEY ("scheduleId") REFERENCES "public"."exam_schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_group_eligibility" ADD CONSTRAINT "schedule_group_eligibility_groupId_participant_group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."participant_group"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_user_eligibility" ADD CONSTRAINT "schedule_user_eligibility_scheduleId_exam_schedule_id_fk" FOREIGN KEY ("scheduleId") REFERENCES "public"."exam_schedule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_user_eligibility" ADD CONSTRAINT "schedule_user_eligibility_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "participant_group_lower_name_idx" ON "participant_group" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "participant_group_member_groupId_idx" ON "participant_group_member" USING btree ("groupId");--> statement-breakpoint
CREATE INDEX "participant_group_member_userId_idx" ON "participant_group_member" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_group_member_groupId_userId_idx" ON "participant_group_member" USING btree ("groupId","userId");--> statement-breakpoint
CREATE INDEX "schedule_group_eligibility_scheduleId_idx" ON "schedule_group_eligibility" USING btree ("scheduleId");--> statement-breakpoint
CREATE INDEX "schedule_group_eligibility_groupId_idx" ON "schedule_group_eligibility" USING btree ("groupId");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_group_eligibility_scheduleId_groupId_idx" ON "schedule_group_eligibility" USING btree ("scheduleId","groupId");--> statement-breakpoint
CREATE INDEX "schedule_user_eligibility_scheduleId_idx" ON "schedule_user_eligibility" USING btree ("scheduleId");--> statement-breakpoint
CREATE INDEX "schedule_user_eligibility_userId_idx" ON "schedule_user_eligibility" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_user_eligibility_scheduleId_userId_idx" ON "schedule_user_eligibility" USING btree ("scheduleId","userId");