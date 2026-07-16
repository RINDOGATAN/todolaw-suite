# todo.law suite v0.1.2 — smaller, smoother

Same three apps, same one command. This release makes the kit itself lighter and
the first run harder to trip over.

```bash
curl -fsSL https://todo.law/install.sh | sh
```

## What's new

- **The kit download is now tiny.** The bundled app source trees (49 MB, 1,100+
  files, a relic of the old build-from-source install) are gone. The apps ship as
  prebuilt images and their source lives in the public repos:
  [dpocentral](https://github.com/RINDOGATAN/dpocentral),
  [deal-room](https://github.com/RINDOGATAN/deal-room),
  [aisentinel](https://github.com/RINDOGATAN/aisentinel).
- **Port check before anything starts.** If another program already uses
  8485/8486/8487, `suite.sh` stops and names the port in plain language instead
  of failing mid-start with a Docker error.
- **Premium skills work on self-host.** The compose now passes
  `SKILL_SIGNING_PUBLIC_KEY` to all three apps, so a purchased `.skill` +
  licence from the todo.law storefront can be verified and activated on your
  own machine. Optional; see `.env.example`. Left unset, premium-skill installs
  are simply rejected (safe default).
- **Friendlier failure notes** — the image-download error now mentions the two
  usual causes (offline, Docker out of disk).
- `https://todo.law/install.sh` no longer dies when run without a controlling
  terminal (CI, AI assistants running the one-liner for you).

## Upgrading from v0.1.1

```bash
git pull        # or re-download the ZIP over the old folder (your .env is kept)
./suite.sh backup && ./suite.sh update
```

Data lives in named Docker volumes and is preserved. Nothing else changed.
