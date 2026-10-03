#!/usr/bin/env python3
"""CHK-008 — a fresh clone runs as the README says, and keeps progress out of git (G13).

Clones the repository's committed state into a temporary folder and, there:
  - the README gives the steps for macOS, Windows and Linux, naming each launcher;
  - the launchers exist (the macOS and Linux ones executable);
  - starting the app with the macOS launcher and with the Linux launcher (each run as the
    README says, with the browser suppressed) serves the app on this computer only;
  - progress sent by the app is saved to my-progress.json inside the clone, and read back;
  - `git status` in the clone then shows nothing to commit: progress never enters git.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
errors: list[str] = []
LAUNCHERS = {"macOS": "Start Polyglotte.command", "Windows": "Start Polyglotte.bat", "Linux": "start-polyglotte.sh"}


def request(url: str, data: dict | None = None) -> dict:
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method="PUT" if body else "GET",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=5) as r:
        return json.load(r)


def run_launcher(clone: Path, cmd: list[str], label: str) -> None:
    env = {**os.environ, "POLYGLOTTE_NO_BROWSER": "1", "POLYGLOTTE_PORT": "0"}
    proc = subprocess.Popen(cmd, cwd=clone, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        url, out, deadline = None, "", time.time() + 15
        while time.time() < deadline and url is None:
            line = proc.stdout.readline()
            if not line:
                break
            out += line
            m = re.search(r"running at (http://127\.0\.0\.1:\d+/)", line)
            if m:
                url = m.group(1)
        if not url:
            errors.append(f"{label}: the app did not start: {out.strip()[:200]}")
            return
        page = urllib.request.urlopen(url, timeout=5).read().decode()
        if "Polyglotte" not in page:
            errors.append(f"{label}: {url} does not serve the app")
        progress = {"version": 2, "language": "fr", "settings": {"passScore": 80},
                    "langs": {"es": {"lessons": {"a1-01": {"passed": True, "best": 100, "attempts": 1}}},
                              "fr": {"lessons": {"a1-01": {"passed": True, "best": 90, "attempts": 1}}}},
                    "label": label}
        if not request(url + "api/progress", progress).get("ok"):
            errors.append(f"{label}: saving progress failed")
        data_file = clone / "my-progress.json"
        if not data_file.exists():
            errors.append(f"{label}: progress was not saved to my-progress.json in the clone")
        elif json.loads(data_file.read_text("utf-8")).get("label") != label:
            errors.append(f"{label}: my-progress.json does not hold the progress just saved")
        back = request(url + "api/progress").get("progress") or {}
        if back.get("label") != label:
            errors.append(f"{label}: progress was not read back from the file")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


with tempfile.TemporaryDirectory(prefix="polyglotte-clone-") as tmp:
    clone = Path(tmp) / "clone"
    subprocess.run(["git", "clone", "--quiet", str(ROOT), str(clone)], check=True)

    readme = (clone / "README.md").read_text("utf-8")
    for system, name in LAUNCHERS.items():
        if not (clone / name).exists():
            errors.append(f"{system} launcher {name!r} is missing from a fresh clone")
        if system not in readme or name not in readme:
            errors.append(f"README does not give the {system} step ({name})")
    for name in (LAUNCHERS["macOS"], LAUNCHERS["Linux"]):
        if (clone / name).exists() and not os.access(clone / name, os.X_OK):
            errors.append(f"{name} is not executable in a fresh clone")
    if "Python" not in readme:
        errors.append("README does not name the prerequisite (Python 3)")

    if (clone / LAUNCHERS["macOS"]).exists():
        run_launcher(clone, ["bash", LAUNCHERS["macOS"]], "macOS launcher")
    if (clone / LAUNCHERS["Linux"]).exists():
        run_launcher(clone, ["sh", LAUNCHERS["Linux"]], "Linux launcher")

    status = subprocess.run(["git", "status", "--porcelain", "--ignored=no"], cwd=clone,
                            capture_output=True, text=True).stdout.strip()
    if status:
        errors.append(f"after saving progress, git sees changes in the clone: {status[:200]}")
    if not (clone / "my-progress.json").exists():
        errors.append("no progress file was written in the clone")
    shutil.rmtree(clone, ignore_errors=True)

if errors:
    print(f"FRESH CLONE CHECK FAILED ({len(errors)} problems)")
    for e in errors:
        print("  -", e)
    sys.exit(1)
print("fresh clone ok: README steps for macOS, Windows and Linux; both launchers start the app; "
      "progress saved in the clone's my-progress.json and ignored by git")
