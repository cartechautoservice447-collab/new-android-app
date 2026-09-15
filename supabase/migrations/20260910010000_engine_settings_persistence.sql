-- Cycle 1: persist the full Liquid Glass Engine settings in the authenticated profile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS engine_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.engine_settings IS
  'User-scoped Liquid Glass Engine preferences persisted by Mobile-liquid-glass.';
