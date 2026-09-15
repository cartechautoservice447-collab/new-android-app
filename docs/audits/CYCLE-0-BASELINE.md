# Cycle 0 — Baseline & Safety Lock

**Repository:** `cartechautoservice447-collab/Mobile-liquid-glass`

**Baseline branch:** `remediation/cycle-0-baseline`

**Source branch:** `main`

**Baseline captured:** 2026-09-10

## Purpose

Freeze the current application state before Cycle 1 remediation. Cycle 0 makes no product-behavior fixes.

## Repository baseline

- Default branch: `main`
- Public repository: yes
- Repository is archived: no
- Existing safety branch created from current `main`: `remediation/cycle-0-baseline`
- Existing historical safety branch observed: `saved-main-2026-09-07`
- Current `main` baseline commit: `842ef93e50deb7ca24be2b885f8105330e12b88d`
- Baseline branch commit after audit-record commit: `c2079f37c65da5a75303e8f7846229a136b1d8fb` (later audit-record commit supersedes this SHA on the branch)

## Current dependency/build baseline

- React: `^19.2.0`
- Vite: `^8.2.0`
- Supabase JS: `^2.112.3`
- Capacitor Android/Core/App: `^8.0.0`
- Node/Java release workflow baseline: Node 22, Java 21
- Current package scripts: dev, build, preview, cap:sync, cap:android
- No root lockfile is present in the repository baseline; the Android workflow currently uses `npm install`.

## Supabase baseline

The current application source is configured to use the Mobile-liquid-glass Supabase project at the configured project URL. The frontend uses a Supabase publishable key and PKCE auth flow. Secret values are intentionally not recorded in this document.

Remote verification of the configured Supabase project was performed:

- Project `asgwpmsuutigtvaxuxmr` (`fluid-glass-studio`) is `ACTIVE_HEALTHY` in region `ap-northeast-2`.
- Public tables currently present include `collections`, `courses`, `lecture_links`, `notes`, `profiles`, and `push_subscriptions`.
- RLS is enabled on all six listed public tables.
- Authenticated-user policies exist for the currently present user-owned tables.
- Supabase security advisor currently reports one warning: leaked-password protection is disabled.

This is a **baseline finding**, not a Cycle 0 fix. It should be handled deliberately within the appropriate authentication/security cycle.

## Web/Vercel baseline

- Production web origin: `https://mobile-liquid-glass.vercel.app`
- Vercel callback rewrite currently routes `/auth/callback` to `/`
- GitHub reports the current `main` commit's Vercel status as `success`.

The Vercel status is recorded as deployment evidence; a full browser workflow audit remains part of later release verification.

## Android baseline

The repository contains a signed Android App Bundle workflow. It uses GitHub Actions secrets for signing material, Node 22 for web dependencies/build, Java 21 for Gradle, and verifies the generated release AAB before uploading it as an artifact.

## Local verification limitation

A clean local clone/build was attempted from the execution environment, but outbound GitHub network/DNS access is unavailable here. Therefore **no local `npm install` or `npm run build` pass is claimed** from this environment.

## Master audit execution rule

The Master Audit remains the source of truth for BUG #1–#45 and related issues. Cycles only organize execution order. Findings are not renumbered.

Cycle execution format:

`Cycle → Part → Existing Master Audit finding(s) → Fix → Verify → Cycle Gate`

## Cycle 0 exit status

- [x] Baseline branch created
- [x] Current repository identity verified
- [x] Current main commit recorded
- [x] Current build/dependency baseline recorded
- [x] Current Supabase connection target recorded without exposing secret values
- [x] Supabase remote project health/RLS presence verified
- [x] Current Vercel callback configuration recorded
- [x] Current Vercel status recorded as `success` for the baseline main commit
- [x] Current Android release workflow baseline recorded
- [x] No application behavior changed by Cycle 0
- [x] Baseline audit document committed on the remediation branch
- [ ] Full local clean-checkout build verification (blocked by this environment's GitHub DNS/network access)
- [ ] Full browser production workflow verification
- [ ] Android release build verification

## Cycle 0 gate

**Status: BASELINE LOCKED / READY FOR CYCLE 1**

Cycle 0 has established a protected remediation branch and recorded the known repository, deployment, Supabase, and Android baseline. No application bug has been marked fixed by Cycle 0.

The Supabase leaked-password-protection warning and other Master Audit findings remain open and must be addressed in their assigned cycles.

## Safety rule for subsequent cycles

All remediation work should be committed on dedicated remediation branches or child branches and verified before merging to `main`. Do not rewrite the historical baseline commit.
