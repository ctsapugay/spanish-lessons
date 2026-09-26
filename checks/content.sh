#!/usr/bin/env bash
# CHK-002: every lesson is complete, answerable, and only tests what has been taught.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/build.py --check
python3 checks/scripts/check_content.py "$@"
