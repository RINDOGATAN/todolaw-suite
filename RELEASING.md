# Releasing the kit (safeguard 7: kit tag, installer pin and image tags move together)

The kit is the files at the repository root: `docker-compose.yml`, `suite.sh`,
`.env.example`, the README, LICENSE, NOTICE and the release notes. A kit
release is a git tag `vX.Y.Z` on this repository. Three things carry that
version and must agree, or an install breaks:

1. **The kit itself**: `KIT_VERSION="vX.Y.Z"` in `suite.sh`, and the six image
   fallbacks `${TODOLAW_VERSION:-vX.Y.Z}` in `docker-compose.yml`. A fresh
   install writes an empty `TODOLAW_VERSION` into `.env`, so the compose file's
   fallback decides which app images run: a kit always runs the images it was
   released with. `suite.sh` warns at start-up if the two disagree.
2. **The app images**: `ghcr.io/rindogatan/{dpocentral,deal-room,aisentinel}`
   and their `-migrator` images must each carry the tag `vX.Y.Z`. App releases
   happen in the app repositories on their own clocks; the kit release is where
   the trio is fixed. Retag what the seam test approved (the `:latest` trio) so
   the tag exists before anyone can install the kit.
3. **The installer pin**: `KIT_URL` in `public/install.sh` of the website
   repository (`~/NEL/todolaw`) names the kit tag fresh installs download, and
   `./suite.sh update` on existing installs reads the same pin to refresh the
   kit (and with it, the image pin). Pushing the website's main deploys it.

The desktop app (`desktop/`) is a separate release (`desktop/RELEASING.md`). It
bundles this compose file at build time and writes `TODOLAW_VERSION=latest`
into `.env`, so desktop installs follow `:latest` until it is rebuilt.

## Every kit release, in order

```bash
cd ~/NEL/todolaw-suite            # on a release branch, never on main directly
V=vX.Y.Z

# 1. Bump the two places the version lives, plus release notes.
sed -i '' "s/^KIT_VERSION=.*/KIT_VERSION=\"$V\"/" suite.sh
sed -i '' "s/\${TODOLAW_VERSION:-v[0-9][0-9.]*}/\${TODOLAW_VERSION:-$V}/g" docker-compose.yml
grep -c "TODOLAW_VERSION:-$V}" docker-compose.yml      # must print 6
grep KIT_VERSION= suite.sh                              # must show $V
cp RELEASE-NOTES-v0.1.13.md RELEASE-NOTES-$V.md && $EDITOR RELEASE-NOTES-$V.md

# 2. Gate.
bash -n suite.sh && docker compose config --quiet
(cd desktop && npm run typecheck && npm test && npm run build)
git commit -am "release: kit $V"

# 3. The app images must exist under the kit tag BEFORE the tag is pushed.
#    Retag the trio the seam test last approved (no pull, no rebuild):
for i in dpocentral dpocentral-migrator deal-room deal-room-migrator aisentinel aisentinel-migrator; do
  docker buildx imagetools create -t ghcr.io/rindogatan/$i:$V ghcr.io/rindogatan/$i:latest
  docker manifest inspect ghcr.io/rindogatan/$i:$V >/dev/null && echo "$i:$V ok"
done

# 4. Merge, tag, push.
git tag -a "$V" -m "todo.law suite kit $V" && git push origin main "$V"

# 5. Move the installer pin, deploy the website, confirm the pin is live.
sed -i '' "s|/tags/v[0-9][0-9.]*\.tar\.gz|/tags/$V.tar.gz|" ~/NEL/todolaw/public/install.sh
(cd ~/NEL/todolaw && git commit -am "install.sh: kit $V" && git push)
curl -sL https://todo.law/install.sh | grep KIT_URL                 # shows tags/$V.tar.gz
```

Step 5 is what makes the release reach anyone: fresh installs download the
pinned tag, and `./suite.sh update` on existing installs refreshes to it.

## Verifying on a clean machine

On a computer (or a fresh user account) with Docker and nothing else:

```bash
curl -fsSL https://todo.law/install.sh | bash         # the public path
cd ~/todo-law && ./suite.sh status                    # "Kit: vX.Y.Z"
grep '^TODOLAW_VERSION=' .env                         # empty value: follows the kit
docker compose images | grep rindogatan               # every app image tagged vX.Y.Z
for p in 8485 8486 8487; do curl -sL -o /dev/null -w "$p %{http_code}\n" http://localhost:$p/; done   # three 200s
```

A red monthly seam test (`.github/workflows/suite-integration.yml`, which boots
`:latest`) means: do not retag or cut a kit until it is green.
