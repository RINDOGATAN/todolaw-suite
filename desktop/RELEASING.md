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
3. **App-specific password for notarization.** Already generated and stored in
   the build Mac's **login keychain** as generic-password item
   **`todolaw-notarize`** (account: the account-holder Apple ID). Retrieve it
   inline with `security find-generic-password -w -s todolaw-notarize` — no
   password manager lookup needed. If it's ever lost, generate a new one at
   <https://appleid.apple.com> → Sign-In & Security → App-Specific Passwords
   and store it back under the same keychain item name.

## Every release

```bash
cd desktop
npm test && npm run typecheck
APPLE_ID="<account-holder Apple ID email>" \
APPLE_APP_SPECIFIC_PASSWORD="$(security find-generic-password -w -s todolaw-notarize)" \
APPLE_TEAM_ID="PVUY3FL877" \
npm run dist
```

`APPLE_TEAM_ID` is required: `build/notarize-dmg.cjs` checks it explicitly and
silently skips DMG notarization + stapling without it.

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

**Normalise the asset name (every release, right after the upload).** The DMG
is built as `TODO.LAW Suite-<version>-arm64.dmg`, with a space. GitHub rewrites
that space on upload, and it has not been consistent about it: desktop-v0.1.4
came out hyphenated (`TODO.LAW-Suite-0.1.4-arm64.dmg`), desktop-v0.1.5 came out
with a period. The website hard-codes the hyphenated form, so an un-normalised
asset gives every visitor a 404 on the download button. Fix it in place rather
than re-uploading:

```bash
ASSET_ID=$(gh api /repos/RINDOGATAN/todolaw-suite/releases/tags/desktop-v<version> \
  --jq '.assets[] | select(.name | endswith(".dmg")) | .id')
gh api --method PATCH "/repos/RINDOGATAN/todolaw-suite/releases/assets/$ASSET_ID" \
  -f name="TODO.LAW-Suite-<version>-arm64.dmg" --jq '.name'
curl -sIL -o /dev/null -w '%{http_code}\n' \
  "https://github.com/RINDOGATAN/todolaw-suite/releases/download/desktop-v<version>/TODO.LAW-Suite-<version>-arm64.dmg"
```

The curl must print 200 before you touch the website.

Then, and only then, add the **Download for Mac** button to `/run` (the four
ways page of storefront v3; the old `/firms` and `/deploy` pages redirect there
permanently since 2026-09-15) and mention it in llms.txt. Never link an
unsigned build. The button URL is the `MAC_DMG_URL` constant in the site repo
(`~/NEL/todolaw`; before storefront v3 it sat at the top of
`src/pages/Firms.tsx` and `src/pages/Deploy.tsx`, so re-check where the `/run`
page keeps it); a kit tag additionally needs `KIT_URL` in
`~/NEL/todolaw/public/install.sh`. Pushing main deploys.

**Checking the deploy landed.** `public/install.sh` is a static file, so
`curl -sL https://todo.law/install.sh | grep KIT_URL` tells you at once. The
buttons are harder: the pages are lazy-loaded, hash-named chunks, and the live
hashes will NOT match a local `npm run build`. Resolve them from the live
entry bundle instead of guessing:

```bash
curl -sL https://todo.law/run | grep -o 'assets/[A-Za-z0-9._-]*\.js'   # entry bundle
curl -sL https://todo.law/assets/<entry>.js | grep -o '[A-Za-z]*-[A-Za-z0-9_-]*\.js'   # find the /run page chunk
curl -sL https://todo.law/assets/<page-chunk>.js | grep -o 'TODO\.LAW-Suite-[0-9.]*-arm64\.dmg'
```

`/es/*` (the Spanish page is `/es/a-tu-manera`) runs off the same root entry
bundle, so it is covered by the same check. The old `/startups` mini-app is
gone: `/startups` now redirects to `/`.

## Verification protocol

Before the first public release, run the clean-Mac protocol: fresh macOS
user (or machine) with no Docker → download DMG from the GitHub release URL
→ opens with zero warnings → wizard installs Docker + suite end-to-end →
three apps answer → `./suite.sh status` from a separately downloaded kit
agrees with the app's panel (shared home honoured).
