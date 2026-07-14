# todo.law suite v0.1.1 — install in a breeze

The suite now installs by **downloading three ready-made apps and starting them** — nothing is built from source, nothing is cloned per app. On any Mac, Windows, or Linux machine with Docker:

```bash
git clone https://github.com/RINDOGATAN/todolaw-suite.git
cd todolaw-suite
cp .env.example .env      # set 3 DB passwords + NEXTAUTH_SECRET
docker compose up -d      # pulls pinned images, migrates, starts all three
```

…or, for a lawyer or office manager who would rather not touch a terminal:

```bash
curl -fsSL https://todo.law/install.sh | sh
```

First run just downloads the images — usually a few minutes. Every run after that takes seconds.

| App | Address |
|---|---|
| DPO Central | http://localhost:8485 |
| Dealroom | http://localhost:8486 |
| AI Sentinel | http://localhost:8487 |

Everything runs and stays on your computer. Sign in on each with your email — the first sign-in creates your local account. The three apps share one network, so the **unified DPIA + AI-Act view** between DPO Central and AI Sentinel works out of the box.

---

## What's new

- **Prebuilt, pinned, multi-arch images (amd64 + arm64)** on GHCR — `ghcr.io/rindogatan/{dpocentral,deal-room,aisentinel}` (+ their `-migrator` images), public, no login to pull.
- **`suite.sh` is now pull-based.** It generates your secrets once into a single root `.env`, pulls the images, starts everything, and writes a bookmarkable `portal/index.html`. No build-from-source, no per-app git clones.
- **Encrypted backup & restore built in** — `./suite.sh backup` writes `openssl`-encrypted dumps to `backups/`; `./suite.sh restore <app> <file>` brings one back.
- **One command to update** — `./suite.sh backup && ./suite.sh update` pulls the newest images and restarts (databases migrate themselves). Pin `TODOLAW_VERSION` in `.env` for a reproducible install.

## Fixes

- **`docker compose up` now works end-to-end for all three apps.** The migrator images bake a build-time `DATABASE_URL=…@localhost:5432/build` placeholder. The compose overrode `DATABASE_URL` at runtime — fine for DPO Central, but **Dealroom** also reads `directUrl = env("DATABASE_URL_UNPOOLED")` and **AI Sentinel** reads a prefixed `env("ais_DATABASE_URL")`, so their migrations previously fell back to the baked `localhost` and failed. The compose now injects `DATABASE_URL_UNPOOLED` (Dealroom) and `ais_DATABASE_URL` (AI Sentinel) on both the migrator and app services.
- Dropped the old build-from-source `suite.sh` path (which also failed for anyone without access to every app's source repo).

## Upgrading from an earlier checkout

```bash
git pull
./suite.sh backup && ./suite.sh update      # or: docker compose pull && docker compose up -d
```

Your data lives in named Docker volumes and is preserved across the upgrade. If you ran a previous build-from-source install, your data is safe — the pull-based stack uses the same database volumes.

## Verified

Fresh install from the public `v0.1.1` images: all three migrators exit `0`, all three apps return HTTP `200`; `status`, `backup`, `restore`, and `stop` all confirmed on a clean throwaway install.

## Security note

Sign-in accepts any email with no password. That is safe **only** because everything binds to `127.0.0.1` (this computer). Put real authentication and HTTPS in front before exposing any port to a network.

**Full compose reference:** `docker-compose.yml` · **Friendly install:** `README.md`
