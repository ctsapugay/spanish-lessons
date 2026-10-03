#!/usr/bin/env bash
# CHK-005: the French curriculum is complete, grounded in French-teaching references, and reviewed.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 checks/scripts/check_curriculum.py --lang fr "$@"
