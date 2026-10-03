#!/usr/bin/env bash
# CHK-007: French spelling, gender and pronunciation guides match the reference lexicon.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 checks/scripts/check_french_accuracy.py "$@"
