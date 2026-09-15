# Cycle 1 — Collection Multi-Delete

## Feature
Collections interface supports top-right delete mode, per-collection checkboxes, a confirmation dialog, and Supabase-backed deletion.

## Persistence
Selected collections are removed from the local workspace state first, then their Supabase rows are deleted through the existing serialized per-user cloud queue. Notes belonging to a deleted collection remain governed by the existing `collection_id SET NULL` relationship.

## Guardrails
- Only selected collections can be deleted.
- Confirmation is required before deletion.
- Existing note delete behavior is unchanged.
- Delete tombstones prevent stale snapshots from recreating deleted collections.
