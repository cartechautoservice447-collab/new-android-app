# Cycle 1 — Note Snapshot Queue Fix

## Finding
Rapid note operations could calculate the next workspace from an older React `courses` snapshot. Supabase serialized cloud writes, but the application could still enqueue a stale snapshot, causing newly created notes to disappear or only one note to remain after navigating away and reopening a collection.

## Fix
Workspace mutations now run through one application-level queue and always derive their next state from the latest in-memory workspace before saving. This prevents one stale snapshot from overwriting notes created by a previous operation.

## Verification target
Create several notes in one collection, navigate Back to Collections, reopen the same collection, and confirm every note remains. Then delete individual notes and repeat navigation/refresh checks; no deleted note may be recreated by a stale snapshot.
