# Step 11 — Signed Android App Bundle

The project is prepared for a production-signed Android App Bundle without storing private signing material in Git.

## Required GitHub Actions secrets

Create these repository secrets before running **Signed Android App Bundle** manually:

- `ANDROID_KEYSTORE_BASE64` — Base64 contents of the upload/release `.jks` or `.keystore` file.
- `ANDROID_KEYSTORE_PASSWORD` — keystore password.
- `ANDROID_KEY_ALIAS` — signing key alias.
- `ANDROID_KEY_PASSWORD` — signing key password.

## Workflow

Run **Signed Android App Bundle** from GitHub Actions (`workflow_dispatch`). The workflow will:

1. Validate all signing inputs are present.
2. Build and sync the current React/Capacitor web app.
3. Restore the keystore only inside the ephemeral GitHub Actions runner.
4. Build `app-release.aab` with the release signing configuration.
5. Verify the AAB is signed with `jarsigner`.
6. Upload the signed AAB as the `mobile-liquid-glass-signed-aab` artifact.

The keystore is never committed to the repository.

## Current Android identity

- Application ID: `com.liquidglass.studio`
- Version code: `1`
- Version name: `1.0`
