# Cycle 1 — Core Data + Persistence

## Execution order

- Part A — authoritative course/collection/note cloud persistence (Master Audit BUG #1)
- Part B — note naming uses the user's entered title (Master Audit BUG #2)
- Part C — stable note IDs are preserved as persistence infrastructure; the learning-history consumer remains owned by Cycle 6 (Master Audit BUG #33)
- Part D — note editor save/exit cannot silently discard the latest draft (Master Audit BUG #39)
- Part E — Engine Settings use the profile's persisted `engine_settings` column (Master Audit ISSUE #11)

## Safety rules

1. Master Audit BUG numbers remain unchanged.
2. Cloud writes are scoped by the authenticated user ID and must never use client-supplied ownership to cross users.
3. A cloud hydration failure must not overwrite remote data with the local seed/default workspace.
4. Deletions performed by the user must be reflected in the cloud state; save synchronization must not leave ghost rows.
5. Stable IDs must not depend on note titles.

## Cycle 1 gate

Create course → refresh → reopen → edit → refresh → create/edit/delete collection/note → refresh → verify cloud rows.

Change Engine Settings → refresh → verify the same profile values return from Supabase.

The cycle closes only when the application behavior and remote database state agree.

## Current implementation status

- Part E code is committed and the `profiles.engine_settings` column has been applied to the production Supabase project.
- Parts A–D are applied by the one-time repository patch workflow and must be verified from the resulting commit before the Cycle 1 gate is closed.
