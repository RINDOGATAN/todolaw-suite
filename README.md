# The todo.law suite, on your own computer

Three legal-practice tools — **DPO Central**, **Dealroom** and **AI Sentinel**
— running entirely on one computer in your office. No cloud account, no
subscription, no data leaving the building.

This kit is for a lawyer or office manager, not an engineer. If you can
install a normal program and copy-paste one line, you can do this.

## Three steps

**1. Install Docker Desktop** (once).
Docker is a free program that runs the suite quietly in the background —
think of it as the engine; you never have to look at it after installing.
Download it here, install it like any other app, and open it once:
<https://www.docker.com/products/docker-desktop/>

**2. Download this kit.**
On this page on GitHub, click the green **Code** button → **Download ZIP**,
and unzip it somewhere sensible (e.g. your Documents folder). Or, if you are
comfortable with the terminal:
`git clone https://github.com/RINDOGATAN/todolaw-suite.git`

**3. Run it.**
Open the Terminal app, drag the kit's folder onto the window (that types its
location for you), press Enter, then type:

```
./suite.sh
```

That is all. The script checks Docker, downloads the three apps, creates all
passwords and keys automatically (they stay on your machine), builds and
starts everything, and finishes with a box telling you the three addresses.
The first run downloads and builds quite a lot — expect 15–30 minutes and a
warm laptop. Every run after that takes seconds.

**4. Bookmark your portal.**
The script also writes a small web page, `portal/index.html`, inside the
kit's folder — open it in your browser (double-click it) and bookmark it.
It shows the three tools as cards: a button to open each one, whether it is
running, which version you have, whether an update is available, and when
the last backup was made. It is refreshed every time you run `./suite.sh`
(any command), so what it shows is always the current truth. To put your
firm's name on top: `BRAND_NAME="Your Firm" ./suite.sh portal`

## What you get

| Product | What it does | Address |
|---|---|---|
| **DPO Central** | Runs your privacy program: processing records, DPIAs, requests, the DPO's whole to-do list. | <http://localhost:8485> |
| **Dealroom** | Structured rooms for negotiating and signing deals and contracts. | <http://localhost:8486> |
| **AI Sentinel** | A register and assessment tool for the AI systems your organisation uses. | <http://localhost:8487> |

Sign in on each with your email address — the first sign-in creates your
account, locally, with no password and no email being sent anywhere. (That is
safe precisely because these pages are only reachable from this computer.)

**All data stays on this computer**, in Docker's storage. Nothing is sent to
any cloud. Your settings and secret keys live in
`apps/<app>/deploy/sovereign/.env` — the script creates them once and never
overwrites them.

## Everyday commands

Open Terminal in the kit's folder and type:

| You want to… | Type |
|---|---|
| Start everything (or install it) | `./suite.sh` |
| See what's running | `./suite.sh status` |
| Stop everything (data is kept) | `./suite.sh stop` |
| Make an encrypted backup | `./suite.sh backup` |
| Update to the latest version | `./suite.sh backup && ./suite.sh update` |
| Refresh the portal page | `./suite.sh portal` |

## Updating safely

One rule: **back up first**. `./suite.sh backup && ./suite.sh update` does
exactly that — backup, then per-app: fetch the latest code, update the
database, rebuild, restart. If anything goes wrong, your backup can bring
everything back.

## Backups, and moving to another computer

`./suite.sh backup` writes an **encrypted** backup file for each app into
`apps/<app>/deploy/sovereign/backups/`. The encryption key is the
`BACKUP_PASSPHRASE` line inside each app's `.env` file — **store a copy of
those three passphrases in your password manager**; without them a backup
cannot be opened, by you or anyone else.

To move to a new computer (or recover after a disaster):

1. On the old machine: `./suite.sh backup`, then copy the newest file from
   each `backups/` folder — and the three `.env` files — to a USB stick.
2. On the new machine: do the three steps at the top, but **before** running
   `./suite.sh`, put each saved `.env` file back into
   `apps/<app>/deploy/sovereign/` (the script will keep them, never
   overwrite). Then run `./suite.sh`.
3. Restore each app's data:
   `cd apps/<app>/deploy/sovereign && ./restore.sh backups/<the file>`
   (it asks you to type RESTORE to confirm — it replaces what's there).

One machine is "the real one" at any moment. Don't work on two copies at
once; there is deliberately no magic merge.

## Questions you might have

**Is this free?**
Yes. The three products are open source under the AGPL licence, and the core
of each is complete — running them on your own hardware like this is exactly
the intended use. (Paid cloud tiers exist for those who want hosting,
billing modules and so on; you need none of that here.)

**Do I need the cloud, or an internet connection?**
No cloud. Internet is only needed to download the apps the first time and
when you choose to update. Day to day, everything works offline.

**What about AI features — do I need an OpenAI/Anthropic key?**
No. These three products are deterministic tools — registers, workflows,
documents. They make no AI calls and need no AI keys. (DPO Central *can*
optionally generate narrative text if you point it at an AI service of your
own; leave that blank and it simply doesn't.)

**Can my colleagues on the office network use it?**
Out of the box, no — the suite only answers on the computer it runs on,
which is the safe default (sign-in is deliberately trusting because of it).
Opening it to the office network, adding HTTPS, and so on is a real
IT task: each app ships its own hardening guide — see the "Hardening" section
in `apps/<app>/deploy/sovereign/README.md` before going beyond one computer.

**I use Windows.**
Install Docker Desktop for Windows and enable **WSL2** when it asks (that is
Windows' built-in Linux layer — Docker's installer sets it up). Then run
`./suite.sh` from an Ubuntu/WSL2 terminal, not from plain PowerShell.

**Something is broken — where do I get help?**
Run `./suite.sh status`, and look at the files in `logs/` — sending the
relevant log file along with your question helps enormously. Help:
Deployment Partners, or **info@rindogatan.com**.

---

*This kit only orchestrates. Each product carries its own verified
self-hosting bundle in its repository (`deploy/sovereign/`) — the compose
files, backup/restore scripts, and hardening notes live there and remain the
source of truth.*
