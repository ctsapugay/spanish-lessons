#!/bin/bash
# Double-click to start the Spanish course. Keep this window open while you study.
cd "$(dirname "$0")" || exit 1
exec python3 scripts/serve.py
