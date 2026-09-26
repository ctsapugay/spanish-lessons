#!/usr/bin/env bash
# CHK-003: the app behaves correctly in a real (headless) browser.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -d node_modules/playwright ]; then
  echo "Playwright is not installed -- run: npm install && npx playwright install chromium"
  exit 1
fi
node checks/scripts/app-test.mjs "$@"
