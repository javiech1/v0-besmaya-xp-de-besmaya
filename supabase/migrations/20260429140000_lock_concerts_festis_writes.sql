-- Lock down public write access to `concerts` and `festis`.
--
-- The seed scripts (scripts/001_*, scripts/002_*) created these tables with
-- INSERT/UPDATE/DELETE policies open to anyone. Combined with the public
-- NEXT_PUBLIC_SUPABASE_ANON_KEY shipped to the browser, that lets any visitor
-- wipe or vandalize tour/festival data via PostgREST.
--
-- Public SELECT stays — the conciertos page reads these tables directly from
-- the client. All writes (the cron cleanup in app/api/cron/cleanup/route.ts)
-- already go through SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS, so
-- removing the write policies does not break the app.

DROP POLICY IF EXISTS "Allow public insert access to concerts" ON public.concerts;
DROP POLICY IF EXISTS "Allow public update access to concerts" ON public.concerts;
DROP POLICY IF EXISTS "Allow public delete access to concerts" ON public.concerts;

DROP POLICY IF EXISTS "Allow public insert access to festis" ON public.festis;
DROP POLICY IF EXISTS "Allow public update access to festis" ON public.festis;
DROP POLICY IF EXISTS "Allow public delete access to festis" ON public.festis;
