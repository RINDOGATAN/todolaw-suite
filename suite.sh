#!/usr/bin/env bash
# ============================================================================
# suite.sh: the todo.law suite on this computer, one command.
#
#   ./suite.sh            install (or start) everything
#   ./suite.sh stop       stop everything (your data is kept)
#   ./suite.sh update     fetch the latest version and restart
#   ./suite.sh backup     make an encrypted backup of each app's data
#   ./suite.sh restore    restore one app from a backup file
#   ./suite.sh status     show what is running
#   ./suite.sh portal     (re)generate portal/index.html, your bookmark page
#
# How it works: this kit ships ONE docker-compose.yml that pulls prebuilt,
# pinned images from GitHub's container registry (GHCR) and runs all three
# apps on one network. There is NOTHING to build and no source code to clone.
# The first run just downloads the images (a few minutes) and starts them.
#
#   DPO Central   privacy-program management     http://localhost:8485
#   Dealroom      deal & contract negotiation    http://localhost:8486
#   AI Sentinel   AI-governance register         http://localhost:8487
#
# Your passwords and keys are generated once, locally, into a .env file next
# to this script and NEVER overwritten. Your data lives in Docker volumes on
# this computer. Nothing is sent to any cloud.
#
# The portal page (portal/index.html) is regenerated at the end of every
# command so what it shows stays honest. Put the firm's name on it with:
#   BRAND_NAME="North End Law" ./suite.sh portal
#
# Works with the bash that ships with macOS (3.2); Linux and Windows/WSL2 too.
# ============================================================================

set -o pipefail

# --- where am I -------------------------------------------------------------
HERE=$(cd "$(dirname "$0")" && pwd)
cd "$HERE" || exit 1
mkdir -p logs backups

ENV_FILE="$HERE/.env"
COMPOSE_FILE="$HERE/docker-compose.yml"
DOCKER_LINK="https://www.docker.com/products/docker-desktop/"

# The version (image tag) to run. Kept in .env so `update` can change it;
# defaults to "latest" so the suite always pulls the newest published images.
DEFAULT_VERSION="latest"

# --- remembered settings (.suite-config) -------------------------------------
if [ -n "${BRAND_NAME:-}" ]; then
  esc=$(printf '%s' "$BRAND_NAME" | sed "s/'/'\\\\''/g")
  printf "# Remembered by suite.sh. Edit or delete freely.\nBRAND_NAME='%s'\n" "$esc" >"$HERE/.suite-config"
elif [ -f "$HERE/.suite-config" ]; then
  . "$HERE/.suite-config"
fi

# The three apps. Plain lists: macOS's default bash has no maps.
APPS="dpocentral dealroom aisentinel"

app_title() { case "$1" in
  dpocentral) echo "DPO Central" ;; dealroom) echo "Dealroom" ;; aisentinel) echo "AI Sentinel" ;;
esac; }
app_port() { case "$1" in
  dpocentral) echo 8485 ;; dealroom) echo 8486 ;; aisentinel) echo 8487 ;;
esac; }
app_blurb() { case "$1" in
  dpocentral) echo "privacy-program management (GDPR records, DPIAs...)" ;;
  dealroom)   echo "deal and contract negotiation rooms" ;;
  aisentinel) echo "AI-governance register and assessments" ;;
esac; }
# docker compose service name of each app's database, and its Postgres user/db.
app_db_svc() { case "$1" in
  dpocentral) echo dpo-db ;; dealroom) echo deal-db ;; aisentinel) echo ais-db ;;
esac; }
app_db_id() { case "$1" in
  dpocentral) echo dpocentral ;; dealroom) echo dealroom ;; aisentinel) echo aisentinel ;;
esac; }

# --- pretty printing (no secrets are ever printed) --------------------------
if [ -t 1 ]; then
  BOLD=$(tput bold 2>/dev/null || true); DIM=$(tput dim 2>/dev/null || true)
  GREEN=$(tput setaf 2 2>/dev/null || true); RED=$(tput setaf 1 2>/dev/null || true)
  YELLOW=$(tput setaf 3 2>/dev/null || true); RESET=$(tput sgr0 2>/dev/null || true)
else
  BOLD=""; DIM=""; GREEN=""; RED=""; YELLOW=""; RESET=""
fi
say()  { printf '%s\n' "$*"; }
ok()   { printf '%s\n' "  ${GREEN}[ok]${RESET} $*"; }
note() { printf '%s\n' "  ${DIM}$*${RESET}"; }
warn() { printf '%s\n' "  ${YELLOW}[!]${RESET} $*"; }
die() {
  printf '\n%s\n\n' "${RED}${BOLD}Stopped:${RESET} $1"; shift
  while [ $# -gt 0 ]; do printf '  %s\n' "$1"; shift; done
  printf '\n'; exit 1
}

# --- prerequisite checks (Docker only: nothing to build, nothing to clone) --
check_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    die "Docker is not installed on this computer." \
        "Docker is the (free) program that runs the suite in the background." \
        "1. Download Docker Desktop here:  $DOCKER_LINK" \
        "2. Install it like any other app, open it once," \
        "3. then run  ./suite.sh  again."
  fi
  if ! docker info >/dev/null 2>&1; then
    die "Docker is installed, but not running right now." \
        "Open the 'Docker Desktop' application (look for the whale icon)," \
        "wait until it says it is running, then run  ./suite.sh  again."
  fi
  if ! docker compose version >/dev/null 2>&1; then
    die "Your Docker is too old (it lacks 'docker compose')." \
        "Please update Docker Desktop:  $DOCKER_LINK"
  fi
  [ -f "$COMPOSE_FILE" ] || die "docker-compose.yml is missing from this kit folder." \
        "Re-download the kit from https://github.com/RINDOGATAN/todolaw-suite"
}

compose() { docker compose --project-directory "$HERE" "$@"; }

# --- settings (.env): generated once, NEVER overwritten --------------------
ensure_env() {
  if [ -f "$ENV_FILE" ]; then
    note "Settings already exist (.env). Keeping them."
    return 0
  fi
  # No settings yet, but is there data from a PREVIOUS install? New random
  # passwords would not open old databases, so stop with a clear choice.
  oldvols=$(docker volume ls -q 2>/dev/null | grep -E '^todolaw-suite_(dpo|deal|ais)-data$' | tr '\n' ' ')
  if [ -n "$oldvols" ]; then
    die "Found data from a previous installation, but no settings file (.env)." \
        "A .env file holds the passwords to that data; without it the old data cannot be opened." \
        "" \
        "Either put your saved .env back next to this script and run ./suite.sh again," \
        "" \
        "or, if that old data does NOT matter (e.g. it was only a test), remove it:" \
        "    docker volume rm $oldvols" \
        "and run  ./suite.sh  again to start fresh."
  fi
  command -v openssl >/dev/null 2>&1 || die "The 'openssl' program is missing (it generates your passwords)." \
        "macOS/Linux ship it; on WSL2 run  sudo apt install openssl"
  umask 077
  cat >"$ENV_FILE" <<EOF
# todo.law suite: settings generated by suite.sh on $(date '+%Y-%m-%d %H:%M').
# Keep this file: it holds the keys to your local databases and backups.
# To move to another computer, copy this file across BEFORE running ./suite.sh.

# Which release to run. "latest" always pulls the newest published images;
# pin a version (e.g. v0.1.1) for a reproducible install.
TODOLAW_VERSION=$DEFAULT_VERSION

# Database passwords (used only inside this stack).
DPO_DB_PASSWORD=$(openssl rand -hex 24)
DEAL_DB_PASSWORD=$(openssl rand -hex 24)
AIS_DB_PASSWORD=$(openssl rand -hex 24)

# Session signing secret shared by the apps.
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Cross-app bridge: the SAME key on DPO Central + AI Sentinel turns on the
# unified DPIA + AI-Act view between them. Generated here so it works out of
# the box; blank it out if you want the two apps fully independent.
BRIDGE_API_KEY=$(openssl rand -hex 24)

# Encrypts ./suite.sh backup files. You need this exact value to restore on
# another computer. Keep a copy somewhere safe (e.g. your password manager).
BACKUP_PASSPHRASE=$(openssl rand -base64 24)
EOF
  chmod 600 "$ENV_FILE"
  ok "Settings created (secrets generated locally, kept private in .env)."
}

env_value() {  # read one value out of .env without sourcing the whole file
  [ -f "$ENV_FILE" ] || return 1
  sed -n "s/^$1=//p" "$ENV_FILE" | head -1
}

# --- start / wait -----------------------------------------------------------
wait_healthy() {  # returns 0 when the app answers HTTP 200
  port=$(app_port "$1"); tries=0
  while [ $tries -lt 90 ]; do
    code=$(curl -sL -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:$port/" 2>/dev/null)
    [ "$code" = "200" ] && return 0
    tries=$((tries + 1)); sleep 2
  done
  return 1
}

running_services() { compose ps --status running --services 2>/dev/null; }
is_running() { running_services | grep -qx "$1"; }

# --- the portal page ---------------------------------------------------------
gen_portal() {
  mkdir -p portal
  out="$HERE/portal/index.html"
  brand="${BRAND_NAME:-todo.law suite}"
  brand=$(printf '%s' "$brand" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')
  gen_at=$(date '+%A %d %B %Y, %H:%M')
  version=$(env_value TODOLAW_VERSION); [ -n "$version" ] || version="$DEFAULT_VERSION"

  docker_up=no; docker info >/dev/null 2>&1 && docker_up=yes
  run_list=""; [ "$docker_up" = "yes" ] && run_list=$(running_services)

  cat >"$out" <<EOF
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>$brand: local portal</title>
<style>
  :root { --ink:#1c2733; --mut:#5c6b7a; --line:#e3e8ee; --bg:#f4f6f8;
          --card:#ffffff; --accent:#2f6f8f; --ok:#1e7d45; --off:#8a97a5; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font:16px/1.55 -apple-system, "Segoe UI", system-ui, sans-serif;
         color:var(--ink); background:var(--bg); padding:2.5rem 1.25rem 4rem; }
  main { max-width:60rem; margin:0 auto; }
  header h1 { font-size:1.7rem; letter-spacing:-.01em; }
  header p  { color:var(--mut); margin-top:.35rem; font-size:.95rem; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(17rem,1fr));
           gap:1rem; margin-top:1.75rem; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:.75rem;
          padding:1.25rem 1.25rem 1.1rem; display:flex; flex-direction:column; gap:.6rem; }
  .card h2 { font-size:1.15rem; }
  .card .desc { color:var(--mut); font-size:.92rem; min-height:2.8em; }
  .state { display:inline-flex; align-items:center; gap:.45rem; font-size:.85rem; font-weight:600; }
  .dot { width:.6rem; height:.6rem; border-radius:50%; display:inline-block; }
  .running  .dot { background:var(--ok); }  .running  { color:var(--ok); }
  .stopped  .dot { background:var(--off); } .stopped  { color:var(--off); }
  .open { display:inline-block; text-align:center; background:var(--accent); color:#fff;
          text-decoration:none; border-radius:.5rem; padding:.5rem .9rem; font-weight:600; font-size:.95rem; }
  .open.dim { background:var(--off); }
  .meta { border-top:1px solid var(--line); padding-top:.6rem; margin-top:.2rem;
          font-size:.82rem; color:var(--mut); display:grid; gap:.15rem; }
  .meta strong { color:var(--ink); font-weight:600; }
  footer { margin-top:2.5rem; color:var(--mut); font-size:.85rem; }
  footer code { background:#e9edf1; border-radius:.3rem; padding:.1rem .4rem; font-size:.85em; color:var(--ink); }
  footer li { margin:.2rem 0 .2rem 1.2rem; }
</style>
</head>
<body>
<main>
<header>
  <h1>$brand</h1>
  <p>Your legal tools, running on this computer (version <strong>$version</strong>).
     Snapshot taken $gen_at. Refresh any time with <code>./suite.sh portal</code>.</p>
</header>
<div class="cards">
EOF

  for app in $APPS; do
    title=$(app_title "$app"); port=$(app_port "$app"); blurb=$(app_blurb "$app")
    url="http://localhost:$port"
    state_cls=stopped; state_txt=STOPPED
    if [ "$docker_up" = "yes" ] && printf '%s\n' "$run_list" | grep -qx "$app"; then
      state_cls=running; state_txt=RUNNING
    fi
    # last backup for this app (newest matching file)
    newest=$(ls -1t "$HERE/backups/${app}-"*.sql.gz.enc 2>/dev/null | head -1)
    if [ -n "$newest" ]; then
      stamp=$(printf '%s' "$newest" | sed -n 's/.*-\([0-9]\{8\}\)-\([0-9]\{6\}\).*/\1\2/p')
      if [ -n "$stamp" ]; then
        bkp="<span>Last backup: <strong>${stamp:6:2}.${stamp:4:2}.${stamp:0:4} at ${stamp:8:2}:${stamp:10:2}</strong></span>"
      else
        bkp="<span>Last backup: <strong>yes</strong></span>"
      fi
    else
      bkp='<span>Last backup: <strong>none yet</strong>. Run ./suite.sh backup</span>'
    fi
    if [ "$state_cls" = "running" ]; then
      openbtn="<a class=\"open\" href=\"$url\">Open $title</a>"
    else
      openbtn="<span class=\"open dim\">Stopped. Start with ./suite.sh</span>"
    fi
    cat >>"$out" <<EOF
<section class="card">
  <h2>$title</h2>
  <p class="desc">$blurb</p>
  <span class="state $state_cls"><span class="dot"></span>$state_txt</span>
  $openbtn
  <div class="meta">
    <span>Address: <strong>$url</strong></span>
    $bkp
  </div>
</section>
EOF
  done

  cat >>"$out" <<'EOF'
</div>
<footer>
  <p>Everything on this page runs and stays on this computer. No cloud.
     Everyday commands (in the kit folder, in Terminal):</p>
  <ul>
    <li><code>./suite.sh</code>: start everything (or install)</li>
    <li><code>./suite.sh stop</code>: stop everything (data is kept)</li>
    <li><code>./suite.sh backup</code>: encrypted backup</li>
    <li><code>./suite.sh update</code>: fetch the latest version (back up first)</li>
    <li><code>./suite.sh portal</code>: refresh this page</li>
  </ul>
</footer>
</main>
</body>
</html>
EOF
}

# --- commands ----------------------------------------------------------------
cmd_up() {
  START=$SECONDS
  say ""
  say "${BOLD}todo.law suite: setting up on this computer.${RESET}"
  say "${DIM}Prebuilt apps are downloaded and run locally. Nothing is sent to any cloud.${RESET}"
  say ""
  check_docker
  ok "Docker is installed and running."
  ensure_env

  say ""
  say "  Downloading the three apps (first time only, a few minutes)..."
  if ! compose pull >>"logs/suite.log" 2>&1; then
    die "Could not download the app images." \
        "Are you connected to the internet? Details are in  logs/suite.log" \
        "You can just run  ./suite.sh  again. It resumes where it left off."
  fi
  ok "Images ready."

  say "  Starting everything (databases migrate automatically on first boot)..."
  if ! compose up -d >>"logs/suite.log" 2>&1; then
    die "The suite failed to start." \
        "The technical details were saved in  logs/suite.log" \
        "Run  ./suite.sh  again to retry, or send that log to your support contact."
  fi

  for app in $APPS; do
    title=$(app_title "$app"); port=$(app_port "$app")
    printf '  Waiting for %s to answer...\n' "$title"
    if wait_healthy "$app"; then
      ok "$title is ready:  http://localhost:$port"
    else
      warn "$title started but is not answering yet. Give it a minute, then open http://localhost:$port"
      warn "If it never answers:  ./suite.sh status   and see logs/suite.log"
    fi
  done

  MIN=$(( (SECONDS - START) / 60 )); SEC=$(( (SECONDS - START) % 60 ))
  say ""
  say "  +----------------------------------------------------------------------+"
  say "  |                                                                      |"
  say "  |   The todo.law suite is running on this computer.                    |"
  say "  |                                                                      |"
  say "  |   DPO Central   http://localhost:8485   privacy management           |"
  say "  |   Dealroom      http://localhost:8486   deal negotiation             |"
  say "  |   AI Sentinel   http://localhost:8487   AI governance                |"
  say "  |                                                                      |"
  say "  |   Sign in on each with your email address (first sign-in creates     |"
  say "  |   your account: local only, no password, no cloud).                  |"
  say "  |                                                                      |"
  say "  |   IMPORTANT. About that sign-in: it accepts ANY email address.       |"
  say "  |   That is safe ONLY because everything binds to this computer        |"
  say "  |   (localhost); nobody else can reach these pages. Do NOT expose      |"
  say "  |   these ports to a network without putting real auth in front.       |"
  say "  |                                                                      |"
  say "  |   Your data lives in Docker volumes on THIS computer only.           |"
  say "  |   Your settings + keys live in the .env file in this folder.         |"
  say "  |                                                                      |"
  say "  |   Stop everything:      ./suite.sh stop                              |"
  say "  |   Start again:          ./suite.sh                                   |"
  say "  |   Update (backup 1st):  ./suite.sh backup && ./suite.sh update       |"
  say "  |   Encrypted backup:     ./suite.sh backup                            |"
  say "  |   What is running:      ./suite.sh status                            |"
  say "  |                                                                      |"
  say "  +----------------------------------------------------------------------+"
  say ""
  gen_portal
  say "  ${BOLD}Your portal page:${RESET} portal/index.html. Open it in your browser and bookmark it."
  say ""
  say "  ${DIM}Done in ${MIN}m ${SEC}s.${RESET}"
  say ""
}

cmd_stop() {
  check_docker
  say ""
  if compose stop >>"logs/suite.log" 2>&1; then
    ok "Everything stopped. (Your data is kept; start again with ./suite.sh)"
  else
    warn "Could not stop cleanly. See logs/suite.log"
  fi
  gen_portal
  say ""
}

cmd_update() {
  check_docker
  say ""
  say "${BOLD}Updating the suite.${RESET}"
  say "${DIM}Tip: run  ./suite.sh backup  first, so you can always go back.${RESET}"
  [ -f "$ENV_FILE" ] || die "Nothing to update. The suite is not installed here yet. Run ./suite.sh first."
  ver=$(env_value TODOLAW_VERSION)
  say ""
  say "  Fetching the latest images (TODOLAW_VERSION=${ver:-$DEFAULT_VERSION})..."
  if ! compose pull >>"logs/suite.log" 2>&1; then
    die "Could not download the update (offline?). Nothing changed." "Details: logs/suite.log"
  fi
  say "  Restarting with the new version (databases migrate automatically)..."
  if compose up -d >>"logs/suite.log" 2>&1; then
    ok "Updated and running."
    for app in $APPS; do
      wait_healthy "$app" && ok "$(app_title "$app"): http://localhost:$(app_port "$app")" \
        || warn "$(app_title "$app") not answering yet. Give it a minute."
    done
  else
    warn "Restart failed. See logs/suite.log"
  fi
  note "Pinned to a specific version? Edit TODOLAW_VERSION in .env, then ./suite.sh update."
  gen_portal
  say ""
}

cmd_backup() {
  check_docker
  say ""
  say "${BOLD}Encrypted backups${RESET} ${DIM}(files land in backups/, encrypted with BACKUP_PASSPHRASE from .env)${RESET}"
  pass=$(env_value BACKUP_PASSPHRASE)
  [ -n "$pass" ] || die "No BACKUP_PASSPHRASE in .env. Cannot encrypt a backup." "Is the suite installed? Run ./suite.sh first."
  stamp=$(date '+%Y%m%d-%H%M%S')
  for app in $APPS; do
    title=$(app_title "$app"); dbsvc=$(app_db_svc "$app"); dbid=$(app_db_id "$app")
    say ""; say "${BOLD}$title${RESET}"
    if ! is_running "$dbsvc"; then
      warn "$title's database is not running. Start the suite first (./suite.sh)."
      continue
    fi
    outfile="$HERE/backups/${app}-${stamp}.sql.gz.enc"
    if compose exec -T "$dbsvc" pg_dump -U "$dbid" -d "$dbid" 2>>"logs/suite.log" \
        | gzip \
        | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "pass:$pass" -out "$outfile" 2>>"logs/suite.log"; then
      ok "backup written: backups/$(basename "$outfile")"
    else
      warn "backup failed for $title. See logs/suite.log"; rm -f "$outfile"
    fi
  done
  say ""
  say "${DIM}Backups are encrypted with BACKUP_PASSPHRASE in .env. Keep a copy of that"
  say "file somewhere safe (password manager). Restore with: ./suite.sh restore <app> <file>${RESET}"
  gen_portal
  say ""
}

cmd_restore() {
  check_docker
  app="${1:-}"; file="${2:-}"
  case " $APPS " in *" $app "*) : ;; *)
    die "Usage: ./suite.sh restore <app> <backup-file>" \
        "  <app> is one of: $APPS" \
        "  example: ./suite.sh restore dpocentral backups/dpocentral-20260711-170000.sql.gz.enc" ;;
  esac
  [ -f "$file" ] || die "Backup file not found: $file" "List available backups:  ls backups/"
  pass=$(env_value BACKUP_PASSPHRASE)
  [ -n "$pass" ] || die "No BACKUP_PASSPHRASE in .env. Cannot decrypt." "You need the .env that made this backup."
  title=$(app_title "$app"); dbsvc=$(app_db_svc "$app"); dbid=$(app_db_id "$app")
  is_running "$dbsvc" || die "$title's database is not running. Start the suite first (./suite.sh)."
  say ""
  warn "This REPLACES all current $title data with the contents of:"
  say "      $file"
  printf '  Type RESTORE to confirm: '
  read -r confirm
  [ "$confirm" = "RESTORE" ] || die "Cancelled. Nothing was changed."
  say "  Restoring $title..."
  if openssl enc -d -aes-256-cbc -pbkdf2 -pass "pass:$pass" -in "$file" 2>>"logs/suite.log" \
      | gunzip \
      | compose exec -T "$dbsvc" psql -U "$dbid" -d "$dbid" >>"logs/suite.log" 2>&1; then
    ok "$title restored. Restart to be safe:  ./suite.sh"
  else
    die "Restore failed. See logs/suite.log" "Your data may be partially changed; restore a known-good backup or reinstall."
  fi
  say ""
}

cmd_status() {
  check_docker
  say ""
  printf '  %-14s %-26s %s\n' "APP" "ADDRESS" "STATUS"
  printf '  %-14s %-26s %s\n' "---" "-------" "------"
  for app in $APPS; do
    title=$(app_title "$app"); port=$(app_port "$app")
    if ! is_running "$app"; then
      printf '  %-14s %-26s %s\n' "$title" "http://localhost:$port" "${DIM}stopped${RESET}"
      continue
    fi
    code=$(curl -sL -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:$port/" 2>/dev/null)
    if [ "$code" = "200" ]; then
      printf '  %-14s %-26s %s\n' "$title" "http://localhost:$port" "${GREEN}running${RESET}"
    else
      printf '  %-14s %-26s %s\n' "$title" "http://localhost:$port" "${YELLOW}starting (HTTP $code)${RESET}"
    fi
  done
  gen_portal
  note "portal/index.html refreshed. That page shows this same picture."
  say ""
}

cmd_portal() {
  gen_portal
  say ""
  ok "Portal page written to  portal/index.html"
  note "Open it in your browser and bookmark it. Refresh any time: ./suite.sh portal"
  note "Put your firm's name on it:  BRAND_NAME=\"Your Firm\" ./suite.sh portal"
  say ""
}

usage() {
  say "todo.law suite usage:"
  say "  ./suite.sh                     install or start everything (safe to repeat)"
  say "  ./suite.sh stop                stop everything (data is kept)"
  say "  ./suite.sh update              fetch the latest version and restart"
  say "  ./suite.sh backup              encrypted backup of each app's data"
  say "  ./suite.sh restore <app> <f>   restore one app from a backup file"
  say "  ./suite.sh status              show what is running"
  say "  ./suite.sh portal              regenerate portal/index.html (your bookmark page)"
}

case "${1:-up}" in
  up)      cmd_up ;;
  stop)    cmd_stop ;;
  update)  cmd_update ;;
  backup)  cmd_backup ;;
  restore) shift; cmd_restore "$@" ;;
  status)  cmd_status ;;
  portal)  cmd_portal ;;
  -h|--help|help) usage ;;
  *) say "Unknown command: $1"; say ""; usage; exit 1 ;;
esac
