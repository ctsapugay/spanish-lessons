#!/bin/bash
# macOS: double-click to start Polyglotte. Keep this window open while you study.
cd "$(dirname "$0")" || exit 1
exec python3 scripts/serve.py
