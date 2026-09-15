# Cycle 1 delete verification

## Defect
A deleted note could reappear after refresh.

## Root causes addressed
- CollectionWorkspace autosave could still hold the deleted draft for its 650ms timer and write it back.
- Workspace cloud synchronization was upsert-only, so a locally absent row was not necessarily removed from Supabase.

## Fix
- Delete flow now cancels pending note autosave by clearing the draft before the delete callback runs.
- Cloud workspace synchronization now removes authenticated user's remote notes, collections, and courses that are absent from the complete hydrated workspace snapshot.
- Existing duplicate-safe UUID normalization remains in place.

## Verification
- `main` before this change: `2fcd9fcdf4ef85e545049d47883c788fbf170f4e`
- Delete-fix branch is exactly 2 commits ahead of `main` and changes only `src/CollectionWorkspace.jsx`, `src/cloudWorkspace.js`, and this audit document.
- Supabase `courses`, `collections`, and `notes` remain reachable and RLS-protected.
- No duplicate primary-key records exist in the current target project.

## Cycle 1 gate behavior
Create course -> refresh -> create collection -> refresh -> create note -> refresh -> delete note -> refresh -> note remains deleted.
