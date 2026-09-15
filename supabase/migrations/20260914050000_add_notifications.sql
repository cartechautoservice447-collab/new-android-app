-- Migration: add global notifications table
-- Safe to run multiple times (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- This table is the persistent store for the cross-project notification system.
-- fluid-glass-studio (or a shared Edge Function) inserts rows via service_role.
-- Mobile-liquid-glass reads and marks rows as read via the authenticated client.

-- ─── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text        NOT NULL,
  body          text        NOT NULL DEFAULT '',
  -- Free-form category label (e.g. 'study_reminder', 'review_ready', 'general')
  type          text        NOT NULL DEFAULT 'general',
  -- Which system created this notification (e.g. 'fluid-glass-studio', 'mobile')
  source        text        DEFAULT NULL,
  read          boolean     NOT NULL DEFAULT false,
  -- Optional structured data for the notification action
  metadata      jsonb       DEFAULT NULL,
  -- ISO timestamp for scheduled/future notifications (informational; delivery
  -- is the server's responsibility)
  scheduled_for timestamptz DEFAULT NULL,
  -- Deep-link URL to open when the notification is tapped
  action_url    text        DEFAULT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users can only read their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- UPDATE: authenticated users can only mark their own notifications as read
-- (client is NOT allowed to change title, body, type, etc.)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  -- Restrict which columns the client may actually change
  WITH CHECK (auth.uid() = user_id);

-- INSERT and DELETE intentionally have no client policy.
-- Only the service_role (backend / other Supabase project) may insert/delete.
-- service_role bypasses RLS by default.

-- ─── Indexes ──────────────────────────────────────────────────────────────────
-- Primary query pattern: fetch newest N notifications for a user
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON public.notifications(user_id, created_at DESC);

-- Partial index for fast unread-count queries
CREATE INDEX IF NOT EXISTS notifications_user_id_unread_idx
  ON public.notifications(user_id)
  WHERE read = false;

-- ─── Supabase Realtime ────────────────────────────────────────────────────────
-- REPLICA IDENTITY FULL lets Realtime broadcast old + new row values on UPDATE.
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add table to the default Supabase Realtime publication so clients can
-- subscribe to INSERT/UPDATE events.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;
