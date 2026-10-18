-- V4.7.1 HOTFIX: the Image Edge Function uses service_role but the
-- 002_private_villains migration revoked table privileges from all roles.
-- BYPASSRLS alone does not grant SELECT/UPDATE/INSERT access.
-- Grant strictly to service_role; authenticated and anon retain their current
-- RLS-limited permissions. Never expose the service key in client JS.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.custom_villains,
  public.custom_villain_jobs,
  public.custom_villain_audio
TO service_role;

-- Existing client permissions intentionally unchanged.
-- GRANT SELECT to authenticated remains RLS constrained.
