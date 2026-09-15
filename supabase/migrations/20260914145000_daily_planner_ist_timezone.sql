-- Daily Planner: store and interpret planner times in India Standard Time.
-- Existing rows are preserved; their existing clock values are reinterpreted as IST.

ALTER TABLE public.daily_planner_items
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata';

UPDATE public.daily_planner_items
SET timezone = 'Asia/Kolkata'
WHERE timezone IS NULL OR timezone = '';

ALTER TABLE public.daily_planner_items
  ALTER COLUMN timezone SET DEFAULT 'Asia/Kolkata';

-- Limit values to the currently supported planner timezone.
ALTER TABLE public.daily_planner_items
  DROP CONSTRAINT IF EXISTS daily_planner_items_timezone_check;

ALTER TABLE public.daily_planner_items
  ADD CONSTRAINT daily_planner_items_timezone_check
  CHECK (timezone = 'Asia/Kolkata');
