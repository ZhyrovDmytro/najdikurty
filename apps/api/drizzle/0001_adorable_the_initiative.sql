ALTER TABLE "availability_slots" DROP CONSTRAINT "availability_slots_court_id_courts_id_fk";
--> statement-breakpoint
CREATE UNIQUE INDEX "courts_id_club_id_unique" ON "courts" USING btree ("id","club_id");--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_court_club_fk" FOREIGN KEY ("court_id","club_id") REFERENCES "public"."courts"("id","club_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
