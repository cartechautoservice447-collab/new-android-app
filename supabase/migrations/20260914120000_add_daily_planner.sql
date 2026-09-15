-- Migration: add daily_planner_items table
-- Safe to run multiple times (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- Stores per-user planner items (reminders, exams, projects, deadlines).
-- Notification delivery is handled server-side by api/planner-cron.js using
-- service_role, which bypasses RLS. The existing api/send-notification.js is
-- called by the cron — no second notification sender is created.

-- ─── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_planner_items (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  title                text        NOT NULL,
  -- 'reminder' | 'exam' | 'project' | 'deadline'
  type                 text        NOT NULL DEFAULT 'reminder',

  -- Recurrence
  -- 'none' | 'daily' | 'weekdays' | 'specific'
  recurrence           text        NOT NULL DEFAULT 'none',
  -- Array of weekday numbers: 0=Sunday … 6=Saturday (used when recurrence='weekdays')
  weekdays             int[]       DEFAULT NULL,
  -- Used when recurrence='specific'
  specific_date        date        DEFAULT NULL,

  -- Scheduling — stored in UTC
  notify_time          time        NOT NULL DEFAULT '09:00:00',
  -- Lead time in minutes before the event (0 = fire at notify_time; 1440 = 1 day before)
  lead_time_minutes    int         NOT NULL DEFAULT 0,

  -- State
  notifications_enabled boolean    NOT NULL DEFAULT true,
  -- Updated by cron after each delivery so we don't fire twice in the same window
  last_notified_at     timestamptz DEFAULT NULL,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.daily_planner_items ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users read only their own items
DROP POLICY IF EXISTS "Users can view own planner items" ON public.daily_planner_items;
CREATE POLICY "Users can view own planner items"
  ON public.daily_planner_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: authenticated users create their own items
DROP POLICY IF EXISTS "Users can insert own planner items" ON public.daily_planner_items;
CREATE POLICY "Users can insert own planner items"
  ON public.daily_planner_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: authenticated users update their own items
DROP POLICY IF EXISTS "Users can update own planner items" ON public.daily_planner_items;
CREATE POLICY "Users can update own planner items"
  ON public.daily_planner_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: authenticated users delete their own items
DROP POLICY IF EXISTS "Users can delete own planner items" ON public.daily_planner_items;
CREATE POLICY "Users can delete own planner items"
  ON public.daily_planner_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- service_role bypasses RLS — cron can read and update all rows.

-- ─── Indexes ──────────────────────────────────────────────────────────────────
-- Primary cron query: active items ordered by time for efficient range scan
CREATE INDEX IF NOT EXISTS daily_planner_items_user_id_idx
  ON public.daily_planner_items(user_id);

CREATE INDEX IF NOT EXISTS daily_planner_items_notify_time_idx
  ON public.daily_planner_items(notify_time)
  WHERE notifications_enabled = true;

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_planner_items_updated_at ON public.daily_planner_items;
CREATE TRIGGER daily_planner_items_updated_at
  BEFORE UPDATE ON public.daily_planner_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
