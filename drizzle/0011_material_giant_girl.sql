CREATE TABLE "participant_import" (
	"id" text PRIMARY KEY NOT NULL,
	"adminId" text NOT NULL,
	"fileName" text NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"created" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participant_import" ADD CONSTRAINT "participant_import_adminId_user_id_fk" FOREIGN KEY ("adminId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "participant_import_adminId_idx" ON "participant_import" USING btree ("adminId");--> statement-breakpoint
CREATE INDEX "participant_import_createdAt_idx" ON "participant_import" USING btree ("createdAt");