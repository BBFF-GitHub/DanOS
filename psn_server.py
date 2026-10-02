#!/usr/bin/env python3
"""
DanOS PSN Server
================
A tiny local HTTP server that bridges DanOS to your PlayStation Network account
using the unofficial psnawp library.

HOW TO RUN:
  pip install psnawp
  python psn_server.py

The server starts on http://localhost:5757
DanOS will call it automatically when you connect your PSN account.

REQUIREMENTS:
  pip install psnawp
"""

import json
import sys
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

try:
    from psnawp_api import PSNAWP
    from psnawp_api.models.trophies.trophy_titles import TrophyTitle
except ImportError:
    print("ERROR: psnawp not installed.")
    print("Run:  pip install psnawp")
    sys.exit(1)

PORT = 5757
_psnawp_client = None   # cached after first auth


def cors_headers(handler):
    handler.send_header("Access-Control-Allow-Origin",  "http://localhost:5173")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")


def json_response(handler, data, status=200):
    body = json.dumps(data, default=str).encode("utf-8")
    handler.send_response(status)
    cors_headers(handler)
    handler.send_header("Content-Type",   "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def error_response(handler, message, status=400):
    json_response(handler, {"error": message}, status)


class PSNHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        # Suppress default request logging; we'll print our own
        pass

    def do_OPTIONS(self):
        self.send_response(200)
        cors_headers(self)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path   = parsed.path

        if path == "/status":
            self._status()
        elif path == "/profile":
            self._profile()
        elif path == "/games":
            self._games()
        elif path == "/trophies":
            qs = parse_qs(parsed.query)
            comm_id  = qs.get("np_communication_id", [None])[0]
            platform = qs.get("platform", ["PS4"])[0]
            self._trophies(comm_id, platform)
        else:
            error_response(self, "Not found", 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path   = parsed.path

        length = int(self.headers.get("Content-Length", 0))
        body   = self.rfile.read(length)
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            data = {}

        if path == "/auth":
            self._auth(data.get("npsso", "").strip())
        else:
            error_response(self, "Not found", 404)

    # ── Endpoints ──────────────────────────────────────────────────

    def _status(self):
        global _psnawp_client
        if _psnawp_client is None:
            json_response(self, {"connected": False})
        else:
            try:
                me = _psnawp_client.me()
                json_response(self, {
                    "connected":  True,
                    "online_id":  me.online_id,
                    "account_id": me.account_id,
                })
            except Exception as e:
                _psnawp_client = None
                json_response(self, {"connected": False, "error": str(e)})

    def _auth(self, npsso):
        global _psnawp_client
        if not npsso:
            error_response(self, "NPSSO token is required")
            return
        try:
            print(f"[PSN] Authenticating with NPSSO token...")
            client = PSNAWP(npsso)
            me     = client.me()
            _psnawp_client = client
            print(f"[PSN] Authenticated as: {me.online_id}")
            json_response(self, {
                "success":    True,
                "online_id":  me.online_id,
                "account_id": me.account_id,
            })
        except Exception as e:
            _psnawp_client = None
            print(f"[PSN] Auth failed: {e}")
            error_response(self, f"Authentication failed: {e}")

    def _profile(self):
        global _psnawp_client
        if _psnawp_client is None:
            error_response(self, "Not authenticated", 401)
            return
        try:
            me      = _psnawp_client.me()
            summary = me.trophy_summary()
            json_response(self, {
                "online_id":    me.online_id,
                "account_id":   me.account_id,
                "trophy_level": summary.trophy_level,
                "progress":     summary.progress,
                "tier":         summary.tier,
                "earned":       {
                    "platinum": summary.earned_trophies.platinum,
                    "gold":     summary.earned_trophies.gold,
                    "silver":   summary.earned_trophies.silver,
                    "bronze":   summary.earned_trophies.bronze,
                },
            })
        except Exception as e:
            traceback.print_exc()
            error_response(self, str(e), 500)

    def _games(self):
        global _psnawp_client
        if _psnawp_client is None:
            error_response(self, "Not authenticated", 401)
            return
        try:
            me     = _psnawp_client.me()
            titles = me.trophy_titles(limit=None)
            games  = []
            for t in titles:
                # Platform: take the first one from the frozenset
                platforms = list(t.title_platform) if t.title_platform else []
                platform  = str(platforms[0]).replace("PlatformType.", "") if platforms else "PS4"

                games.append({
                    "np_communication_id": t.np_communication_id,
                    "title":               t.title_name,
                    "platform":            platform,
                    "icon_url":            t.title_icon_url,
                    "progress":            t.progress,
                    "has_trophy_groups":   t.has_trophy_groups,
                    "last_updated":        str(t.last_updated_datetime) if t.last_updated_datetime else None,
                    "defined": {
                        "platinum": t.defined_trophies.platinum,
                        "gold":     t.defined_trophies.gold,
                        "silver":   t.defined_trophies.silver,
                        "bronze":   t.defined_trophies.bronze,
                    },
                    "earned": {
                        "platinum": t.earned_trophies.platinum,
                        "gold":     t.earned_trophies.gold,
                        "silver":   t.earned_trophies.silver,
                        "bronze":   t.earned_trophies.bronze,
                    },
                })
            print(f"[PSN] Fetched {len(games)} games")
            json_response(self, {"games": games})
        except Exception as e:
            traceback.print_exc()
            error_response(self, str(e), 500)

    def _trophies(self, np_communication_id, platform_str):
        global _psnawp_client
        if _psnawp_client is None:
            error_response(self, "Not authenticated", 401)
            return
        if not np_communication_id:
            error_response(self, "np_communication_id required")
            return
        try:
            from psnawp_api.models.trophies.trophy_constants import TrophyType, PlatformType

            # Map platform string to enum
            platform_map = {
                "PS5":  PlatformType.PS5,
                "PS4":  PlatformType.PS4,
                "PS3":  PlatformType.PS3,
                "VITA": PlatformType.PS_VITA,
            }
            platform = platform_map.get(platform_str.upper(), PlatformType.PS4)

            me = _psnawp_client.me()
            trophies_iter = me.trophies(
                np_communication_id = np_communication_id,
                platform            = platform,
                include_progress    = True,
                trophy_group_id     = "all",
            )

            trophies = []
            for t in trophies_iter:
                trophy_type_raw = t.trophy_type
                if trophy_type_raw is None:
                    trophy_type = "bronze"
                elif hasattr(trophy_type_raw, 'name'):
                    trophy_type = trophy_type_raw.name.lower()
                else:
                    trophy_type = str(trophy_type_raw).replace("TrophyType.", "").lower()
                trophies.append({
                    "id":          t.trophy_id,
                    "name":        t.trophy_name,
                    "description": t.trophy_detail,
                    "type":        trophy_type,
                    "hidden":      t.trophy_hidden or False,
                    "icon_url":    t.trophy_icon_url,
                    "earned":      getattr(t, "earned", False) or False,
                    "earned_at":   str(getattr(t, "earned_date_time", None)) if getattr(t, "earned_date_time", None) else None,
                    "group_id":    t.trophy_group_id,
                })
            print(f"[PSN] Fetched {len(trophies)} trophies for {np_communication_id}")
            json_response(self, {"trophies": trophies})
        except Exception as e:
            traceback.print_exc()
            error_response(self, str(e), 500)


if __name__ == "__main__":
    print("=" * 55)
    print("  DanOS PSN Server")
    print(f"  Running on http://localhost:{PORT}")
    print("  Keep this window open while using DanOS")
    print("=" * 55)
    server = HTTPServer(("localhost", PORT), PSNHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[PSN] Server stopped.")
