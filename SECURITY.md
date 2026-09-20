# Security policy

This repository is the self-hosted kit of the todo.law suite (DPO Central,
Dealroom, AI Sentinel) and the TODO.LAW Suite desktop app for Mac. It holds
no application code: the three apps come as prebuilt images from GHCR.

## Reporting a vulnerability

Write to **info@rindogatan.com** with "Security" in the subject. Please do not
open a public GitHub issue for a vulnerability. Include the kit version
(`./suite.sh status` prints it), or the desktop app version, and the steps to
reproduce. We aim to acknowledge within five working days.

A vulnerability in one of the apps themselves (DPO Central, Dealroom,
AI Sentinel) may be reported the same way; we route it to that app's
repository.

## Supported versions

Only the latest kit release (the newest `vX.Y.Z` tag) and the latest desktop
release (`desktop-vX.Y.Z`) receive fixes. Upgrade with
`./suite.sh backup && ./suite.sh update`.

## What this kit protects, and what it does not

See [docs/security.md](docs/security.md). It separates the self-hosted
posture (this kit) from the hosted cloud service, which has its own posture
and is documented in each app's repository.
