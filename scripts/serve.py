#!/usr/bin/env python3
"""Run the Spanish course from this computer and save progress to a file.

Started by the "Start Spanish.command" launcher. It serves the app on this machine only
(127.0.0.1) and keeps your progress in my-progress.json in the course folder, so clearing
browser data never loses it. The previous version is kept as my-progress.backup.json.
Nothing is sent anywhere else.

    python3 scripts/serve.py                  # start and open the browser
    python3 scripts/serve.py --no-browser     # start only
    python3 scripts/serve.py --port 0 --data /tmp/p.json   # used by the tests
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import urllib.request
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
DEFAULT_DATA = ROOT / "my-progress.json"
DEFAULT_PORT = 8766
MAX_BODY = 5 * 1024 * 1024
APP_ID = "spanish-lessons"


class Handler(SimpleHTTPRequestHandler):
    data_file: Path = DEFAULT_DATA

    def log_message(self, *args):  # keep the launcher window quiet
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # Only this machine's own pages may use the API: refuse other hosts (DNS rebinding)
    # and requests sent by other websites open in the browser.
    def _local_request(self) -> bool:
        host = (self.headers.get("Host") or "").rsplit(":", 1)[0]
        if host not in ("127.0.0.1", "localhost"):
            return False
        origin = self.headers.get("Origin")
        if origin is None:
            return True
        port = self.server.server_address[1]
        return origin in (f"http://127.0.0.1:{port}", f"http://localhost:{port}")

    def _json(self, status: int, body: dict):
        raw = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/ping":
            return self._json(200, {"app": APP_ID})
        if path == "/api/progress":
            if not self._local_request():
                return self._json(403, {"error": "forbidden"})
            progress = None
            if self.data_file.exists():
                try:
                    progress = json.loads(self.data_file.read_text("utf-8"))
                except (OSError, ValueError):
                    return self._json(500, {"error": "progress file unreadable"})
            return self._json(200, {"progress": progress, "file": self.data_file.name})
        if path.startswith("/api/"):
            return self._json(404, {"error": "not found"})
        return super().do_GET()

    def do_PUT(self):
        if self.path.split("?", 1)[0] != "/api/progress":
            return self._json(404, {"error": "not found"})
        if not self._local_request():
            return self._json(403, {"error": "forbidden"})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self._json(400, {"error": "bad size"})
        try:
            data = json.loads(self.rfile.read(length))
        except ValueError:
            return self._json(400, {"error": "not JSON"})
        if not isinstance(data, dict) or not isinstance(data.get("lessons"), dict):
            return self._json(400, {"error": "not progress data"})
        target = self.data_file
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            shutil.copy2(target, target.with_name(target.stem + ".backup.json"))
        tmp = target.with_name(target.name + ".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), "utf-8")
        os.replace(tmp, target)  # atomic: the file is never half-written
        return self._json(200, {"ok": True})


def already_running(port: int) -> bool:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/ping", timeout=1) as r:
            return json.load(r).get("app") == APP_ID
    except Exception:
        return False


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--port", type=int, default=DEFAULT_PORT)
    ap.add_argument("--data", type=Path, default=DEFAULT_DATA)
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()

    if args.port and already_running(args.port):
        url = f"http://127.0.0.1:{args.port}/"
        print(f"The course is already running at {url} — opening it.")
        if not args.no_browser:
            webbrowser.open(url)
        return 0

    Handler.data_file = args.data.resolve()
    handler = partial(Handler, directory=str(APP))
    server = None
    ports = [args.port] if args.port == 0 else list(range(args.port, args.port + 10))
    for port in ports:
        try:
            server = ThreadingHTTPServer(("127.0.0.1", port), handler)
            break
        except OSError:
            continue
    if server is None:
        print(f"Could not start: ports {ports[0]}–{ports[-1]} are all in use.")
        return 1

    url = f"http://127.0.0.1:{server.server_address[1]}/"
    print(f"Spanish course running at {url}", flush=True)
    print(f"Progress is saved to {Handler.data_file}", flush=True)
    print("Keep this window open while you study. Close it (or press Ctrl+C) to stop.", flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
