# TODO.LAW Suite for Mac (desktop launcher)

A desktop app that installs and runs the todo.law suite — **DPO Central**
(http://localhost:8485), **Dealroom** (http://localhost:8486) and **AI Sentinel**
(http://localhost:8487) — on this computer, with no terminal. It is the graphical
twin of the CLI kit's `suite.sh`: same `docker-compose.yml` (bundled into the app),
same canonical install home (`~/todo-law`), same `.env` contract (generated once,
never overwritten — an existing CLI-kit install is adopted), same encrypted-backup
format (`openssl enc -aes-256-cbc -pbkdf2` compatible, so backups restore with
`./suite.sh restore` and vice versa), and the same safety guards (one home per
computer, previous-install data protection, port pre-flight on 8485/8486/8487).

## Dev

```bash
npm install
npm run dev        # electron-vite dev (opens the window)
npm test           # vitest — pure unit tests, no docker
npm run typecheck  # tsc --noEmit
npm run dist       # bundle ../docker-compose.yml + build the .dmg (unsigned locally)
```

## Status: M1 — unsigned

This milestone produces a working, **unsigned** local build. The mac signing +
notarization plumbing is kept in `electron-builder.yml` / `build/notarize-dmg.cjs`
and no-ops without Apple credentials; the `notarize.teamId` is a TODO placeholder
until we have a Developer ID.

Scope doc: `suite-desktop-app-scope-2026-07-16.md`.

## Licensing

Apache-2.0 (see `LICENSE`). Portions adapted from LQ.AI Desktop — see `NOTICES.md`.
