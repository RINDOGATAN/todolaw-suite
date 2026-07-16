# Releasing TODO.LAW Suite.app (signed + notarized DMG)

Team: Rindogatan's existing Apple Developer enrollment, **PVUY3FL877** (the
firmas.io team). The DMG needs a **Developer ID Application** certificate —
a *different* certificate type from the iOS/App Store ones, made for apps
distributed outside the Mac App Store. Creating one is restricted to the
account holder, so the one-time setup below cannot be automated.

## One-time setup (account holder, ~5 minutes)

A private key + CSR already exist on the build Mac (generated 2026-07-16,
never leave the machine): `~/nel-signing/developer-id-application.key.pem`
and `~/nel-signing/developer-id-application.csr`.

1. **Create the certificate.** Sign in at
   <https://developer.apple.com/account/resources/certificates/add>,
   choose **Developer ID Application**, and upload
   `~/nel-signing/developer-id-application.csr`. Download the resulting
   `developerID_application.cer`.
2. **Install the identity** (Terminal):

   ```bash
   security import ~/Downloads/developerID_application.cer -k ~/Library/Keychains/login.keychain-db
   security import ~/nel-signing/developer-id-application.key.pem -k ~/Library/Keychains/login.keychain-db
   security find-identity -v -p codesigning   # must list: "Developer ID Application: … (PVUY3FL877)"
   ```

   If the identity shows as untrusted, install Apple's intermediate from
   <https://www.apple.com/certificateauthority/> (Developer ID CA) and re-check.
3. **App-specific password for notarization.** At <https://appleid.apple.com>
   → Sign-In & Security → App-Specific Passwords → generate one named
   `todolaw-suite-notarize`. Store it in the password manager.

## Every release

```bash
cd desktop
npm test && npm run typecheck
APPLE_ID="<account-holder Apple ID email>" \
APPLE_APP_SPECIFIC_PASSWORD="<the app-specific password>" \
npm run dist
```

electron-builder signs the .app (hardened runtime + entitlements), notarizes
it, builds the DMG, signs it, and `build/notarize-dmg.cjs` notarizes + staples
the DMG itself — so the *downloaded* file opens with no Gatekeeper warning.

**Verify before publishing** (both must pass):

```bash
stapler validate "dist/TODO.LAW Suite-<version>-arm64.dmg"
hdiutil attach "dist/TODO.LAW Suite-<version>-arm64.dmg"
spctl -a -vv "/Volumes/Install TODO.LAW Suite/TODO.LAW Suite.app"   # "accepted … Developer ID"
hdiutil detach "/Volumes/Install TODO.LAW Suite"
```

**Publish:**

```bash
gh release create desktop-v<version> "dist/TODO.LAW Suite-<version>-arm64.dmg" \
  -R RINDOGATAN/todolaw-suite -t "TODO.LAW Suite.app v<version>" \
  -n "Signed + notarized macOS app. Installs and operates the self-hosted suite with no terminal."
```

Then, and only then, add the **Download for Mac** button to `/firms` and
`/deploy` (app = Option A, the one-liner = Option B) and mention it in
llms.txt. Never link an unsigned build.

## Verification protocol

Before the first public release, run the clean-Mac protocol: fresh macOS
user (or machine) with no Docker → download DMG from the GitHub release URL
→ opens with zero warnings → wizard installs Docker + suite end-to-end →
three apps answer → `./suite.sh status` from a separately downloaded kit
agrees with the app's panel (shared home honoured).
