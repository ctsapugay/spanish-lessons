#!/bin/sh
# Linux (or any Unix): run ./start-polyglotte.sh to start Polyglotte. Keep the terminal open while you study.
cd "$(dirname "$0")" || exit 1
exec python3 scripts/serve.py
