ALTER TABLE "exam_package" ADD COLUMN "slug" text;--> statement-breakpoint
DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, name FROM "exam_package" ORDER BY "createdAt", id LOOP
    base := regexp_replace(regexp_replace(btrim(lower(r.name)), '[^a-z0-9]+', '-', 'g'), '^[-]+|[-]+$', '', 'g');
    base := regexp_replace(left(base, 80), '[-]+$', '', 'g');
    IF base = '' THEN base := 'item'; END IF;
    candidate := base;
    n := 2;
    WHILE EXISTS (SELECT 1 FROM "exam_package" WHERE "slug" = candidate) LOOP
      candidate := left(base, 80 - length(n::text) - 1) || '-' || n;
      n := n + 1;
    END LOOP;
    UPDATE "exam_package" SET "slug" = candidate WHERE id = r.id;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "exam_package" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "exam_package_slug_idx" ON "exam_package" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "exam_schedule" ADD COLUMN "slug" text;--> statement-breakpoint
DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, name FROM "exam_schedule" ORDER BY "createdAt", id LOOP
    base := regexp_replace(regexp_replace(btrim(lower(r.name)), '[^a-z0-9]+', '-', 'g'), '^[-]+|[-]+$', '', 'g');
    base := regexp_replace(left(base, 80), '[-]+$', '', 'g');
    IF base = '' THEN base := 'item'; END IF;
    candidate := base;
    n := 2;
    WHILE EXISTS (SELECT 1 FROM "exam_schedule" WHERE "slug" = candidate) LOOP
      candidate := left(base, 80 - length(n::text) - 1) || '-' || n;
      n := n + 1;
    END LOOP;
    UPDATE "exam_schedule" SET "slug" = candidate WHERE id = r.id;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "exam_schedule" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "exam_schedule_slug_idx" ON "exam_schedule" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "participant_group" ADD COLUMN "slug" text;--> statement-breakpoint
DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, name FROM "participant_group" ORDER BY "createdAt", id LOOP
    base := regexp_replace(regexp_replace(btrim(lower(r.name)), '[^a-z0-9]+', '-', 'g'), '^[-]+|[-]+$', '', 'g');
    base := regexp_replace(left(base, 80), '[-]+$', '', 'g');
    IF base = '' THEN base := 'item'; END IF;
    candidate := base;
    n := 2;
    WHILE EXISTS (SELECT 1 FROM "participant_group" WHERE "slug" = candidate) LOOP
      candidate := left(base, 80 - length(n::text) - 1) || '-' || n;
      n := n + 1;
    END LOOP;
    UPDATE "participant_group" SET "slug" = candidate WHERE id = r.id;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "participant_group" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "participant_group_slug_idx" ON "participant_group" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "question_bank" ADD COLUMN "slug" text;--> statement-breakpoint
DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, name FROM "question_bank" ORDER BY "createdAt", id LOOP
    base := regexp_replace(regexp_replace(btrim(lower(r.name)), '[^a-z0-9]+', '-', 'g'), '^[-]+|[-]+$', '', 'g');
    base := regexp_replace(left(base, 80), '[-]+$', '', 'g');
    IF base = '' THEN base := 'item'; END IF;
    candidate := base;
    n := 2;
    WHILE EXISTS (SELECT 1 FROM "question_bank" WHERE "slug" = candidate) LOOP
      candidate := left(base, 80 - length(n::text) - 1) || '-' || n;
      n := n + 1;
    END LOOP;
    UPDATE "question_bank" SET "slug" = candidate WHERE id = r.id;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "question_bank" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "question_bank_slug_idx" ON "question_bank" USING btree ("slug");
