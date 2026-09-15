# Cycle 1 implementation notes

## Part A — BUG #1
Course, collection, and note changes now use a direct persistence path: local cache is updated immediately, authenticated cloud writes are awaited, and explicit course/note deletes are sent to Supabase using stable cloud UUID resolution.

## Part B — BUG #2
Verified on the baseline code: note creation already uses the entered `newNoteName` value, falling back to `New Note` only when blank. No behavior-changing rewrite was necessary.

## Part C — BUG #33 prerequisite
Stable cloud UUID mappings remain keyed by entity type + local ID, so note renames do not change the persisted note ID. The title-derived learning-history consumer is intentionally deferred to Cycle 6.

## Part D — BUG #39
The collection editor now flushes the current draft through the save callback before navigating away, while retaining inactivity autosave.

## Part E — ISSUE #11
The full Engine Settings object hydrates from `profiles.engine_settings` for authenticated users and persists changes back to that profile. Local storage remains a user-scoped cache/fallback.
