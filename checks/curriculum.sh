#!/usr/bin/env bash
# CHK-001: the curriculum is complete, grounded in recorded research, and reviewed.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 checks/scripts/check_curriculum.py "$@"
