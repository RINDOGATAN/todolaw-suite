# The todo.law suite, on your own computer

Three legal-practice tools: **DPO Central**, **Dealroom** and **AI Sentinel**,
running entirely on one computer in your office. No cloud account, no
subscription, no data leaving the building.

This kit is for a lawyer or office manager, not an engineer. If you can
install a normal program and copy-paste one line, you can do this. There is
nothing to build: the kit downloads three ready-made apps and starts them.

## Three steps

**1. Get Docker** (once). Docker is the free engine that runs the suite
quietly in the background; after this step you never look at it again.
Find your computer below and do only that block:

**On a Mac.**
Download **Docker Desktop** and install it like any other app:
<https://www.docker.com/products/docker-desktop/>
Then open it once. The first open is chatty: **accept its licence agreement**,
and enter **your computer's password** when it asks (that request comes from
Docker, and it is normal). Wait until it says it is running (the whale icon
settles down), close the window, and you are done with Docker.

**On Windows.**
Install **Docker Desktop** from the same address. When the installer asks
about **WSL2**, say yes (that is Windows' built-in Linux layer; the installer
sets it up and may restart the computer). Open Docker Desktop once and accept
its licence. One extra, once-only step: open **PowerShell** (blue icon in the
Start menu), type `wsl --install`, and let it finish. From now on you will
paste suite commands into the **Ubuntu** app in your Start menu — not into
PowerShell.

**On Linux (Ubuntu and friends).**
No Docker Desktop needed. In a terminal:
`curl -fsSL https://get.docker.com | sh`
then let yourself use Docker without sudo:
`sudo usermod -aG docker $USER` — log out and back in once, and you are set.

Two things worth knowing: Docker likes room. Keep roughly **15–20 GB of
free disk space**. And Docker Desktop (the Mac/Windows app) is **free below
Docker's company-size threshold** (currently fewer than 250 employees *and*
under US $10 m annual revenue, almost every law firm qualifies); larger
organisations need a paid Docker subscription. The Linux engine is free for
everyone.

**2. Download this kit.**
On this page on GitHub, click the green **Code** button → **Download ZIP**,
and unzip it somewhere sensible (e.g. your Documents folder). Or, in a
terminal:
`git clone https://github.com/RINDOGATAN/todolaw-suite.git`

**3. Run it.**
Open a terminal — on a Mac or Linux that is the **Terminal** app; on Windows
it is the **Ubuntu** app from step 1 (not PowerShell). Drag the kit's folder
onto the window (that types its location for you), press Enter, then type:

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
account, locally, with no email being sent anywhere. New installs also set a
**workspace passphrase** (shown in the box at the end of the install, and any
time with `./suite.sh passphrase`): each browser is asked for it once before
sign-in. Your email is your *identity* — it names you on approvals, audit
trails and licences; the passphrase is the *lock*. The three apps share one
network, so DPO Central and AI Sentinel light up their **unified DPIA +
AI-Act view** out of the box.

> **⚠ What actually protects your data.**
> The suite answers to this computer alone (localhost) — nobody on the
> network can reach these pages at all. The workspace passphrase adds a
> speed bump against casual snooping *at* the computer; the real wall for a
> lost or stolen machine is your computer's own login and disk encryption
> (FileVault on a Mac — turn it on). If you ever expose the apps to the
> office network or beyond, put real authentication (and HTTPS) in front of
> them *first*.

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
| See (or change) the workspace passphrase | `./suite.sh passphrase` |
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
No key is needed and, out of the box, the apps make **no AI calls at all**.
Each app has an *optional* AI assistant (drafting DPIA narratives, breach
notifications, negotiation explanations) that stays **off until two things
happen**: you point the suite at an AI engine of your choice in `.env` (your
own API key, or a fully local model via `docker compose --profile ai up -d` —
see `.env.example` for recipes), *and* an administrator switches it on inside
the app, with their name recorded. Leave it off and the products stay fully
deterministic. Every AI draft is labelled and lands only where a human
reviews and saves it.

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
Follow the Windows block in step 1 (Docker Desktop with WSL2, then
`wsl --install` once in PowerShell). After that, every suite command is
pasted into the **Ubuntu** app from your Start menu — never into PowerShell.

**Something is broken? Where do I get help?**
Run `./suite.sh status`, and look at `logs/suite.log`. Sending that file
along with your question helps enormously. Help: **info@rindogatan.com**.
