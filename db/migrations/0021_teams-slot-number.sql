ALTER TABLE "teams" ADD COLUMN "slot_number" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "teams_session_slot_uq" ON "teams" USING btree ("session_id","slot_number") WHERE "slot_number" IS NOT NULL;
