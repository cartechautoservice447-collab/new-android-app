# Cycle 1 delete gate

The note resurrection defect is addressed in `remediation/cycle-1-delete-fix`.

- Pending editor autosave is cancelled before deletion.
- Cloud synchronization removes user-owned rows absent from the fully hydrated workspace snapshot.
- Stable ID and duplicate-safe upsert protections remain active.

Final behavioral gate: delete a note, refresh, and confirm it remains absent.
