CREATE TYPE "public"."scrape_run_status" AS ENUM('running', 'success', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."scrape_target_status" AS ENUM('pending', 'running', 'failed', 'paused');--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"court_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"available" boolean NOT NULL,
	"price" numeric(10, 2),
	"currency" text,
	"booking_url" text,
	"fetched_at" timestamp with time zone NOT NULL,
	"source_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_slots_positive_duration_check" CHECK ("availability_slots"."ends_at" > "availability_slots"."starts_at"),
	CONSTRAINT "availability_slots_nonnegative_price_check" CHECK ("availability_slots"."price" is null or "availability_slots"."price" >= 0),
	CONSTRAINT "availability_slots_currency_check" CHECK ("availability_slots"."currency" is null or "availability_slots"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "availability_slots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "booking_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_providers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"provider_id" uuid NOT NULL,
	"provider_external_id" text,
	"provider_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"booking_url" text NOT NULL,
	"address" text,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"timezone" text DEFAULT 'Europe/Prague' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_latitude_range_check" CHECK ("clubs"."latitude" is null or "clubs"."latitude" between -90 and 90),
	CONSTRAINT "clubs_longitude_range_check" CHECK ("clubs"."longitude" is null or "clubs"."longitude" between -180 and 180)
);
--> statement-breakpoint
ALTER TABLE "clubs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "courts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"indoor" boolean,
	"surface" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scrape_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"status" "scrape_run_status" DEFAULT 'running' NOT NULL,
	"duration_ms" integer,
	"records_received" integer DEFAULT 0 NOT NULL,
	"records_changed" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_message" text,
	"attempt" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scrape_runs_duration_check" CHECK ("scrape_runs"."duration_ms" is null or "scrape_runs"."duration_ms" >= 0),
	CONSTRAINT "scrape_runs_records_received_check" CHECK ("scrape_runs"."records_received" >= 0),
	CONSTRAINT "scrape_runs_records_changed_check" CHECK ("scrape_runs"."records_changed" >= 0),
	CONSTRAINT "scrape_runs_attempt_check" CHECK ("scrape_runs"."attempt" >= 1),
	CONSTRAINT "scrape_runs_completion_check" CHECK ("scrape_runs"."completed_at" is null or "scrape_runs"."completed_at" >= "scrape_runs"."started_at")
);
--> statement-breakpoint
ALTER TABLE "scrape_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scrape_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"target_date" date NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"next_refresh_at" timestamp with time zone NOT NULL,
	"last_refresh_at" timestamp with time zone,
	"status" "scrape_target_status" DEFAULT 'pending' NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scrape_targets_attempt_count_check" CHECK ("scrape_targets"."attempt_count" >= 0),
	CONSTRAINT "scrape_targets_lock_pair_check" CHECK (("scrape_targets"."locked_at" is null and "scrape_targets"."locked_by" is null) or ("scrape_targets"."locked_at" is not null and "scrape_targets"."locked_by" is not null))
);
--> statement-breakpoint
ALTER TABLE "scrape_targets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_provider_id_booking_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."booking_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courts" ADD CONSTRAINT "courts_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_provider_id_booking_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."booking_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_targets" ADD CONSTRAINT "scrape_targets_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_slots_identity_unique" ON "availability_slots" USING btree ("club_id","court_id","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "availability_slots_starts_available_idx" ON "availability_slots" USING btree ("starts_at","available");--> statement-breakpoint
CREATE INDEX "availability_slots_club_starts_idx" ON "availability_slots" USING btree ("club_id","starts_at");--> statement-breakpoint
CREATE INDEX "availability_slots_fetched_at_idx" ON "availability_slots" USING btree ("fetched_at");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_providers_key_unique" ON "booking_providers" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "clubs_slug_unique" ON "clubs" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "clubs_provider_external_id_unique" ON "clubs" USING btree ("provider_id","provider_external_id") WHERE "clubs"."provider_external_id" is not null;--> statement-breakpoint
CREATE INDEX "clubs_provider_id_idx" ON "clubs" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courts_club_external_id_unique" ON "courts" USING btree ("club_id","external_id");--> statement-breakpoint
CREATE INDEX "courts_club_id_idx" ON "courts" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "scrape_runs_club_started_idx" ON "scrape_runs" USING btree ("club_id","started_at");--> statement-breakpoint
CREATE INDEX "scrape_runs_provider_started_idx" ON "scrape_runs" USING btree ("provider_id","started_at");--> statement-breakpoint
CREATE INDEX "scrape_runs_status_started_idx" ON "scrape_runs" USING btree ("status","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "scrape_targets_club_date_unique" ON "scrape_targets" USING btree ("club_id","target_date");--> statement-breakpoint
CREATE INDEX "scrape_targets_due_idx" ON "scrape_targets" USING btree ("status","next_refresh_at","priority");--> statement-breakpoint
CREATE INDEX "scrape_targets_locked_at_idx" ON "scrape_targets" USING btree ("locked_at");