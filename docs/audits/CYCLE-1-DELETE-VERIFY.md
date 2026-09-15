# Cycle 1 Delete Verification

The final delete path is protected against stale-write resurrection.

## Verified in source

- Cloud writes are serialized per authenticated user.
- Note delete creates a tombstone before the delete operation enters the write queue.
- Snapshot saves filter tombstoned entity IDs.
- Explicit note deletion verifies the row is absent from Supabase.
- The editor cancels its pending autosave before deleting a note.
- Snapshot reconciliation removes remote rows absent from the hydrated local snapshot.

## Required live gate

Create a note -> refresh -> delete the note -> refresh repeatedly -> note remains absent.
Then create a different note -> refresh -> new note remains present.
