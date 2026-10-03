#!/usr/bin/env bash
# CHK-008: a fresh clone starts as the README says, saves progress locally, and keeps it out of git.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 checks/scripts/check_fresh_clone.py "$@"
