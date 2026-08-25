CREATE EXTENSION IF NOT EXISTS "pg_cron";--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.cleanup_expired_operational_data()
RETURNS TABLE (
	deleted_availability_slots bigint,
	deleted_scrape_targets bigint,
	deleted_scrape_runs bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
	prague_today date := (now() AT TIME ZONE 'Europe/Prague')::date;
BEGIN
	DELETE FROM public.availability_slots
	WHERE ends_at < now();
	GET DIAGNOSTICS deleted_availability_slots = ROW_COUNT;

	DELETE FROM public.scrape_targets
	WHERE target_date < prague_today
		AND status <> 'running';
	GET DIAGNOSTICS deleted_scrape_targets = ROW_COUNT;

	DELETE FROM public.scrape_runs
	WHERE started_at < now() - interval '30 days'
		AND status <> 'running';
	GET DIAGNOSTICS deleted_scrape_runs = ROW_COUNT;

	RETURN NEXT;
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.cleanup_expired_operational_data() FROM PUBLIC;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.run_sunday_data_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
	prague_now timestamp := now() AT TIME ZONE 'Europe/Prague';
BEGIN
	-- pg_cron uses GMT in Supabase. The job runs at both UTC offsets that can
	-- correspond to 23:30 Prague time; this guard makes only the correct run act.
	IF extract(isodow FROM prague_now) = 7 AND extract(hour FROM prague_now) = 23 THEN
		PERFORM public.cleanup_expired_operational_data();
	END IF;
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.run_sunday_data_cleanup() FROM PUBLIC;--> statement-breakpoint

SELECT cron.schedule(
	'mamekurt-weekly-data-cleanup',
	'30 21,22 * * 0',
	'SELECT public.run_sunday_data_cleanup();'
);
