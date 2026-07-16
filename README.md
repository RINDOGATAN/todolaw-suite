# The todo.law suite, on your own computer

Three legal-practice tools: **DPO Central**, **Dealroom** and **AI Sentinel**,
running entirely on one computer in your office. No cloud account, no
subscription, no data leaving the building.

This kit is for a lawyer or office manager, not an engineer. If you can
install a normal program and copy-paste one line, you can do this. There is
nothing to build: the kit downloads three ready-made apps and starts them.

## Three steps

**1. Install Docker Desktop** (once).
Docker is a free program that runs the suite quietly in the background.
Think of it as the engine; you never have to look at it after installing.
Download it here and install it like any other app:
<https://www.docker.com/products/docker-desktop/>

Then open it once. The first open is chatty: it asks you to **accept its
licence agreement**, and on a Mac also for **your computer's password** so it
can finish its own setup (that request comes from Docker, and it is normal).
Approve both, wait until it says it is running (the whale icon settles down),
and you can close the window. You are done with Docker.

Two things worth knowing: Docker likes room. Keep roughly **15–20 GB of
free disk space**. And Docker Desktop is **free below Docker's company-size
threshold** (currently fewer than 250 employees *and* under US $10 m annual
revenue, almost every law firm qualifies); larger organisations need a paid
Docker subscription.

**2. Download this kit.**
On this page on GitHub, click the green **Code** button → **Download ZIP**,
and unzip it somewhere sensible (e.g. your Documents folder). Or, in a
terminal:
`git clone https://github.com/RINDOGATAN/todolaw-suite.git`

**3. Run it.**
Open the Terminal app, drag the kit's folder onto the window (that types its
location for you), press Enter, then type:

```
./suite.sh
```

If you see **"permission denied"**, type `bash suite.sh` instead. This
happens when the kit came as a ZIP download (unzipping loses the file's
"may run" marker) and is completely harmless.

That is all. The script checks Docker, generates all your passwords and keys
automatically (they stay on your machine), **downloads the three ready-made
apps and starts them**, and finishes with a box showing the three addresses.
Because the apps are prebuilt, the first run just downloads them. **Usually a
few minutes** depending on your connection. Every run after that takes seconds.

**4. Bookmark your portal.**
The script also writes a small web page, `portal/index.html`, inside the
kit's folder. Open it in your browser (double-click it) and bookmark it. It
shows the three tools as cards: a button to open each one, whether it is
running, and when the last backup was made. It is refreshed every time you
run `./suite.sh` (any command). To put your firm's name on top:
`BRAND_NAME="Your Firm" ./suite.sh portal`. The name is remembered from then
on (in a small `.suite-config` file in the kit's folder).

## What you get

| Product | What it does | Address |
|---|---|---|
| **DPO Central** | Runs your privacy program: processing records, DPIAs, requests, the DPO's whole to-do list. | <http://localhost:8485> |
| **Dealroom** | Structured rooms for negotiating and signing deals and contracts. | <http://localhost:8486> |
| **AI Sentinel** | A register and assessment tool for the AI systems your organisation uses. | <http://localhost:8487> |

Sign in on each with your email address. The first sign-in creates your
account, locally, with no password and no email being sent anywhere. The
three apps share one network, so DPO Central and AI Sentinel light up their
**unified DPIA + AI-Act view** out of the box.

> **⚠ Read this before ever opening a port.**
> Sign-in accepts **any email address, with no password**. That is safe
> **only** because the suite answers to this computer alone (localhost).
> Nobody else can reach these pages. If you ever expose the apps to the
> office network or beyond, that trusting sign-in becomes an open door: put
> real authentication (and HTTPS) in front of them *first*.

**All data stays on this computer**, in Docker's storage. Nothing is sent to
any cloud. Your settings and secret keys live in the **`.env`** file next to
this script. The script creates it once and never overwrites it.

## Everyday commands

Open Terminal in the kit's folder and type:

| You want to… | Type |
|---|---|
| Start everything (or install it) | `./suite.sh` |
| See what's running | `./suite.sh status` |
| Stop everything (data is kept) | `./suite.sh stop` |
| Make an encrypted backup | `./suite.sh backup` |
| Update to the latest version | `./suite.sh backup && ./suite.sh update` |
| Restore one app from a backup | `./suite.sh restore <app> <file>` |
| Refresh the portal page | `./suite.sh portal` |

## Updating safely

One rule: **back up first**. `./suite.sh backup && ./suite.sh update` does
exactly that: backup, then download the newest images and restart (databases
migrate themselves). If anything goes wrong, your backup can bring everything
back.

Want a fixed, reproducible version instead of always-latest? Edit
`TODOLAW_VERSION` in `.env` (e.g. `v0.1.1`), then `./suite.sh update`.

## Backups, and moving to another computer

`./suite.sh backup` writes an **encrypted** backup for each app into
`backups/`. The encryption key is the `BACKUP_PASSPHRASE` line inside your
`.env` file. **Store a copy of your `.env` in your password manager**;
without it a backup cannot be opened, by you or anyone else.

To move to a new computer (or recover after a disaster):

1. On the old machine: `./suite.sh backup`, then copy the newest file from
   `backups/` for each app, and your **`.env`** file, to a USB stick.
2. On the new machine: do the three steps at the top, but **before** running
   `./suite.sh`, put your saved `.env` back in the kit folder (the script
   keeps it, never overwrites). Then run `./suite.sh`.
3. Restore each app's data:
   `./suite.sh restore <app> backups/<the file>`
   (it asks you to type RESTORE to confirm; it replaces what's there).

One machine is "the real one" at any moment. Don't work on two copies at
once; there is deliberately no magic merge.

---

## For the technically inclined: the raw one-liner

`suite.sh` is a friendly wrapper. Under the hood the kit is a single
`docker-compose.yml` that pulls pinned, prebuilt images from GHCR
(`ghcr.io/rindogatan/{dpocentral,deal-room,aisentinel}` + their `-migrator`
images). If you would rather drive Docker yourself:

```bash
git clone https://github.com/RINDOGATAN/todolaw-suite.git
cd todolaw-suite
cp .env.example .env      # set the three DB passwords + NEXTAUTH_SECRET
                          # (optional: BRIDGE_API_KEY to link DPO ↔ AI Sentinel)
docker compose up -d      # pulls images, migrates, starts all three
```

Ports: DPO Central `8485`, Dealroom `8486`, AI Sentinel `8487`. Data lives in
named Docker volumes and survives restarts and version bumps. To upgrade, bump
`TODOLAW_VERSION` in `.env` and `docker compose up -d` again. Everything binds
to `127.0.0.1`. Put a reverse proxy with real auth in front before exposing
it anywhere.

## Questions you might have

**Is this free?**
Yes. The three products are open source under the AGPL licence, and the core
of each is complete. Running them on your own hardware like this is exactly
the intended use.

**Do I need the cloud, or an internet connection?**
No cloud. Internet is only needed to download the apps the first time and when
you choose to update. Day to day, everything works offline.

**What about AI features? Do I need an OpenAI/Anthropic key?**
No. These three products are deterministic tools: registers, workflows,
documents. They make no AI calls and need no AI keys. (DPO Central *can*
optionally generate narrative text if you point it at an AI service of your
own; leave that blank and it simply doesn't.)

**Can my colleagues on the office network use it?**
Out of the box, no. The suite only answers on the computer it runs on, which
is the safe default (sign-in is deliberately trusting because of it). Opening
it to the office network, adding HTTPS, and so on is a real IT task. Put a
reverse proxy with real authentication in front first.

**It says a port is already in use.**
The suite lives on ports 8485, 8486 and 8487 of this computer. If another
program already sits on one of them, the script stops and names the port
before touching anything. Quit that other program (or run the suite on a
different computer) and run `./suite.sh` again.

**I use Windows.**
Install Docker Desktop for Windows and enable **WSL2** when it asks (that is
Windows' built-in Linux layer; Docker's installer sets it up). Then run
`./suite.sh` from an Ubuntu/WSL2 terminal, not from plain PowerShell.

**Something is broken? Where do I get help?**
Run `./suite.sh status`, and look at `logs/suite.log`. Sending that file
along with your question helps enormously. Help: **info@rindogatan.com**.
