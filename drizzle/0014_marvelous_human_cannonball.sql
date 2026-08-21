ALTER TABLE "attempt" ADD COLUMN "nomorPeserta" text;--> statement-breakpoint
ALTER TABLE "exam_package" ADD COLUMN "kodePaket" text;--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    'PKG-' || lpad(row_number() OVER (ORDER BY "createdAt", id)::text, 3, '0') AS code
  FROM "exam_package"
)
UPDATE "exam_package" SET "kodePaket" = ranked.code FROM ranked WHERE "exam_package".id = ranked.id;--> statement-breakpoint
ALTER TABLE "exam_package" ALTER COLUMN "kodePaket" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "nisn" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "nis" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "nip" text;--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_scheduleId_nomorPeserta_idx" ON "attempt" USING btree ("scheduleId","nomorPeserta");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_package_kodePaket_idx" ON "exam_package" USING btree ("kodePaket");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_nisn_unique" UNIQUE("nisn");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_nis_unique" UNIQUE("nis");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_nip_unique" UNIQUE("nip");
