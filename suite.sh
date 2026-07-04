#!/usr/bin/env bash
# ============================================================================
# suite.sh — the todo.law suite on this computer, one command.
#
#   ./suite.sh            install (or start) everything
#   ./suite.sh stop       stop everything (your data is kept)
#   ./suite.sh update     update each app safely (pull + migrate + rebuild)
#   ./suite.sh backup     make an encrypted backup of each app's data
#   ./suite.sh status     show what is running
#
# What it orchestrates (it never duplicates the apps' own deploy bundles —
# each app ships its own verified deploy/sovereign/ directory and this
# script simply drives them):
#
#   DPO Central   privacy-program management     http://localhost:8485
#   Dealroom      deal & contract negotiation    http://localhost:8486
#   AI Sentinel   AI-governance register         http://localhost:8487
#
# Safe to run again at any time: existing settings (.env files) are NEVER
# overwritten, and starting an already-running suite does nothing harmful.
# Works with the bash that ships with macOS (3.2); Linux and Windows/WSL2 too.
# ============================================================================

set -o pipefail

# --- where am I -------------------------------------------------------------
HERE=$(cd "$(dirname "$0")" && pwd)
cd "$HERE" || exit 1
mkdir -p apps logs

GITHUB_ORG="https://github.com/RINDOGATAN"
DOCKER_LINK="https://www.docker.com/products/docker-desktop/"

# The three apps. (Plain lists — the macOS default bash has no fancy maps.)
APPS="dpocentral deal-room aisentinel"

app_title() {  # repo name -> human name
  case "$1" in
    dpocentral) echo "DPO Central" ;;
    deal-room)  echo "Dealroom" ;;
    aisentinel) echo "AI Sentinel" ;;
  esac
}

app_port() {
  case "$1" in
    dpocentral) echo 8485 ;;
    deal-room)  echo 8486 ;;
    aisentinel) echo 8487 ;;
  esac
}

app_blurb() {
  case "$1" in
    dpocentral) echo "privacy-program management (GDPR records, DPIAs...)" ;;
    deal-room)  echo "deal and contract negotiation rooms" ;;
    aisentinel) echo "AI-governance register and assessments" ;;
  esac
}

bundle_dir() { echo "$HERE/apps/$1/deploy/sovereign"; }

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
  printf '\n%s\n\n' "${RED}${BOLD}Stopped:${RESET} $1"
  shift
  while [ $# -gt 0 ]; do printf '  %s\n' "$1"; shift; done
  printf '\n'
  exit 1
}

# --- prerequisite checks ----------------------------------------------------
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
  if ! command -v git >/dev/null 2>&1; then
    die "The 'git' program is missing (it downloads the apps)." \
        "macOS: run  xcode-select --install   in Terminal and accept." \
        "Linux/WSL2: sudo apt install git"
  fi
}

# --- get the code -----------------------------------------------------------
ensure_repo() {
  app=$1
  if [ -d "apps/$app/.git" ]; then
    if git -C "apps/$app" pull --ff-only >>"logs/$app.log" 2>&1; then
      note "$(app_title "$app"): code is up to date."
    else
      warn "$(app_title "$app"): could not check for updates (offline?). Using the copy already on this computer."
    fi
  else
    say "  Downloading $(app_title "$app")..."
    if ! git clone "$GITHUB_ORG/$app.git" "apps/$app" >>"logs/$app.log" 2>&1; then
      die "Could not download $(app_title "$app") from $GITHUB_ORG/$app" \
          "Are you connected to the internet?" \
          "Details were saved in  logs/$app.log"
    fi
    ok "$(app_title "$app") downloaded."
  fi
}

# --- settings (.env) — generated once, NEVER overwritten --------------------
ensure_env() {
  app=$1
  dir=$(bundle_dir "$app")
  envfile="$dir/.env"
  if [ -f "$envfile" ]; then
    note "$(app_title "$app"): settings already exist — keeping them."
    return 0
  fi
  port=$(app_port "$app")
  # Random secrets, generated locally, stored only in the .env file.
  pw=$(openssl rand -hex 24)          || die "openssl failed to generate a password."
  auth=$(openssl rand -base64 32)     || die "openssl failed to generate a secret."
  bkp=$(openssl rand -base64 24)      || die "openssl failed to generate a passphrase."
  umask 077
  cat >"$envfile" <<EOF
# $(app_title "$app") — settings generated by suite.sh on $(date '+%Y-%m-%d %H:%M').
# Keep this file: it holds the keys to this app's local database and backups.
# All other options (brand name, colors, office-network access...) are
# documented in .env.example next to this file.

POSTGRES_PASSWORD=$pw
NEXTAUTH_SECRET=$auth
PUBLIC_URL=http://localhost:$port

# Used to encrypt backups (./suite.sh backup). If you ever move to another
# computer you will need this exact value to restore — keep a copy somewhere
# safe (e.g. your password manager).
BACKUP_PASSPHRASE=$bkp
EOF
  chmod 600 "$envfile"
  ok "$(app_title "$app"): settings created (secrets generated, kept private in $envfile)."
}

# --- start / wait -----------------------------------------------------------
compose() {  # compose <app> <args...>
  app=$1; shift
  ( cd "$(bundle_dir "$app")" && docker compose "$@" )
}

up_app() {
  app=$1
  title=$(app_title "$app")
  say "  Building and starting $title (the first time takes several minutes — coffee time)..."
  if ! compose "$app" up -d --build >>"logs/$app.log" 2>&1; then
    die "$title failed to start." \
        "The technical details were saved in  logs/$app.log" \
        "You can try again with  ./suite.sh  — it picks up where it left off." \
        "If it keeps failing, send that log file to your support contact."
  fi
}

wait_healthy() {  # returns 0 when the app answers with HTTP 200
  app=$1
  port=$(app_port "$app")
  tries=0
  while [ $tries -lt 90 ]; do
    code=$(curl -sL -o /dev/null -w '%{http_code}' --max-time 5 "http://localhost:$port/" 2>/dev/null)
    if [ "$code" = "200" ]; then return 0; fi
    tries=$((tries + 1))
    sleep 2
  done
  return 1
}

running_containers() {  # container IDs for one app's stack (empty if down)
  compose "$1" ps -q 2>/dev/null
}

# --- commands ----------------------------------------------------------------
cmd_up() {
  START=$SECONDS
  say ""
  say "${BOLD}todo.law suite — setting up on this computer.${RESET}"
  say "${DIM}Everything runs and stays locally. Nothing is sent to any cloud.${RESET}"
  say ""
  check_docker
  ok "Docker is installed and running."

  i=0
  for app in $APPS; do
    i=$((i + 1))
    title=$(app_title "$app")
    port=$(app_port "$app")
    say ""
    say "${BOLD}[$i/3] $title${RESET} ${DIM}— $(app_blurb "$app")${RESET}"
    ensure_repo "$app"
    ensure_env "$app"
    up_app "$app"
    say "  Waiting for $title to answer..."
    if wait_healthy "$app"; then
      ok "$title is ready:  http://localhost:$port"
    else
      warn "$title started but is not answering yet. Give it a minute, then open http://localhost:$port"
      warn "If it never answers:  ./suite.sh status   and see logs/$app.log"
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
  say "  |   Sign in on each with your email address (first sign-in creates    |"
  say "  |   your account — local only, no password, no cloud).                 |"
  say "  |                                                                      |"
  say "  |   Your data lives in Docker volumes on THIS computer only.           |"
  say "  |   Your settings live in apps/*/deploy/sovereign/.env                 |"
  say "  |                                                                      |"
  say "  |   Stop everything:      ./suite.sh stop                              |"
  say "  |   Start again:          ./suite.sh                                   |"
  say "  |   Update (backup 1st):  ./suite.sh backup && ./suite.sh update       |"
  say "  |   Encrypted backup:     ./suite.sh backup                            |"
  say "  |   What is running:      ./suite.sh status                            |"
  say "  |                                                                      |"
  say "  +----------------------------------------------------------------------+"
  say ""
  say "  ${DIM}Done in ${MIN}m ${SEC}s.${RESET}"
  say ""
}

cmd_stop() {
  check_docker
  say ""
  for app in $APPS; do
    title=$(app_title "$app")
    if [ ! -d "$(bundle_dir "$app")" ]; then
      note "$title: not installed here — skipping."
      continue
    fi
    if compose "$app" down >>"logs/$app.log" 2>&1; then
      ok "$title stopped. (Your data is kept — start again with ./suite.sh)"
    else
      warn "$title: could not stop cleanly — see logs/$app.log"
    fi
  done
  say ""
}

cmd_update() {
  check_docker
  say ""
  say "${BOLD}Updating the suite, one app at a time.${RESET}"
  say "${DIM}Tip: run  ./suite.sh backup  first, so you can always go back.${RESET}"
  for app in $APPS; do
    title=$(app_title "$app")
    say ""
    say "${BOLD}$title${RESET}"
    if [ ! -d "apps/$app/.git" ]; then
      note "not installed here — skipping."
      continue
    fi
    if ! git -C "apps/$app" pull --ff-only >>"logs/$app.log" 2>&1; then
      warn "could not download the update (offline?) — leaving $title as it is."
      continue
    fi
    ok "latest code downloaded."
    say "  Updating the database (migrator)..."
    if ! compose "$app" run --rm --build migrator >>"logs/$app.log" 2>&1; then
      warn "database update failed — $title left as it was. See logs/$app.log"
      continue
    fi
    say "  Rebuilding and restarting (a few minutes)..."
    if compose "$app" up -d --build app >>"logs/$app.log" 2>&1; then
      ok "$title updated and running:  http://localhost:$(app_port "$app")"
    else
      warn "restart failed — see logs/$app.log"
    fi
  done
  say ""
}

cmd_backup() {
  check_docker
  say ""
  say "${BOLD}Encrypted backups${RESET} ${DIM}(each app's own backup.sh; files land in apps/<app>/deploy/sovereign/backups/)${RESET}"
  for app in $APPS; do
    title=$(app_title "$app")
    dir=$(bundle_dir "$app")
    say ""
    say "${BOLD}$title${RESET}"
    if [ ! -x "$dir/backup.sh" ]; then
      note "not installed here — skipping."
      continue
    fi
    if [ -z "$(running_containers "$app")" ]; then
      warn "$title is not running — a backup needs the app up. Run ./suite.sh first."
      continue
    fi
    if ( cd "$dir" && ./backup.sh ); then
      ok "backup written to  apps/$app/deploy/sovereign/backups/"
    else
      warn "backup failed for $title — see the message above."
    fi
  done
  say ""
  say "${DIM}Backups are encrypted with the BACKUP_PASSPHRASE in each app's .env —"
  say "keep a copy of those files somewhere safe (password manager).${RESET}"
  say ""
}

cmd_status() {
  check_docker
  say ""
  printf '  %-14s %-26s %s\n' "APP" "ADDRESS" "STATUS"
  printf '  %-14s %-26s %s\n' "---" "-------" "------"
  for app in $APPS; do
    title=$(app_title "$app")
    port=$(app_port "$app")
    if [ ! -d "$(bundle_dir "$app")" ]; then
      printf '  %-14s %-26s %s\n' "$title" "http://localhost:$port" "not installed"
      continue
    fi
    if [ -z "$(running_containers "$app")" ]; then
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
  say ""
}

usage() {
  say "todo.law suite — usage:"
  say "  ./suite.sh            install or start everything (safe to repeat)"
  say "  ./suite.sh stop       stop everything (data is kept)"
  say "  ./suite.sh update     pull latest code, migrate, rebuild (per app)"
  say "  ./suite.sh backup     encrypted backup of each app's data"
  say "  ./suite.sh status     show what is running"
}

case "${1:-up}" in
  up)      cmd_up ;;
  stop)    cmd_stop ;;
  update)  cmd_update ;;
  backup)  cmd_backup ;;
  status)  cmd_status ;;
  -h|--help|help) usage ;;
  *) say "Unknown command: $1"; say ""; usage; exit 1 ;;
esac
