# Cycle 1 — Course and Note Delete Remediation

This change hardens delete/hydration behavior without changing unrelated product behavior.

Goals:
- Prevent stale workspace loads from overwriting a completed delete.
- Make course and note deletes idempotent and verify the server no longer exposes the row.
- Keep deletion tombstones across refreshes.
- Keep note snapshot saves non-destructive; notes are removed only by explicit delete.
- Keep course/collection snapshot reconciliation serialized per authenticated user.
- Preserve user-scoped cloud/local identity mapping.
