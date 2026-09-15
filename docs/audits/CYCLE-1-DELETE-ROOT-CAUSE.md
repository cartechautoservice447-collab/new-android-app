# Cycle 1 — Note Delete Root Cause

## Root cause

Workspace writes were not serialized per authenticated user. A delete could be followed by an already-scheduled/stale autosave or snapshot write using the old workspace, which could re-upsert the deleted note before or after the explicit delete request.

## Fix requirements

- Serialize all course/collection/note cloud mutations per authenticated user.
- Record deleted entity IDs as local tombstones so stale snapshots cannot recreate a just-deleted row.
- Apply tombstones while building every subsequent snapshot payload.
- Perform explicit deletion and verify the remote row is absent.
- Keep snapshot reconciliation as a second deletion safeguard.

## Verification gate

Delete note -> cloud row absent -> reload workspace from Supabase -> note remains absent -> create a new note -> new note persists -> refresh.
