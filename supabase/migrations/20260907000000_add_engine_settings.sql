-- Liquid Glass Engine preferences. Safe to apply only when the existing profiles table is present.
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS engine_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END
$$;
