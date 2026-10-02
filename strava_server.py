#!/usr/bin/env python3
"""
DanOS Strava Sync Server
=========================
Handles Strava OAuth and activity fetching for DanOS.

SETUP:
1. Go to https://www.strava.com/settings/api
2. Create an app (set Authorization Callback Domain to: localhost)
3. Copy your Client ID and Client Secret
4. Enter them in the DanOS Fitness page → Strava Connect
5. Run this server: python strava_server.py
6. Click "Connect Strava" in DanOS

This server runs on http://localhost:5858
"""

import json
import os
import urllib.request
import urllib.parse
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone

PORT = 5858
TOKEN_FILE = os.path.join(os.path.dirname(__file__), '.strava_tokens.json')

STRAVA_AUTH_URL    = 'https://www.strava.com/oauth/authorize'
STRAVA_TOKEN_URL   = 'https://www.strava.com/oauth/token'
STRAVA_API_BASE    = 'https://www.strava.com/api/v3'
REDIRECT_URI       = f'http://localhost:{PORT}/callback'

# ── Token persistence ─────────────────────────────────────────────
def load_tokens():
    try:
        if os.path.exists(TOKEN_FILE):
            with open(TOKEN_FILE) as f:
                return json.load(f)
    except Exception:
        pass
    return {}

def save_tokens(data):
    with open(TOKEN_FILE, 'w') as f:
        json.dump(data, f)

def get_valid_token(client_id, client_secret):
    """Return a valid access token, refreshing if needed."""
    tokens = load_tokens()
    if not tokens.get('access_token'):
        return None, "Not authenticated"
    # Refresh if expired (with 5-min buffer)
    if tokens.get('expires_at', 0) < (datetime.now(timezone.utc).timestamp() + 300):
        try:
            data = urllib.parse.urlencode({
                'client_id':     client_id,
                'client_secret': client_secret,
                'grant_type':    'refresh_token',
                'refresh_token': tokens['refresh_token'],
            }).encode()
            req = urllib.request.Request(STRAVA_TOKEN_URL, data=data, method='POST')
            with urllib.request.urlopen(req) as r:
                new_tokens = json.loads(r.read())
            tokens.update(new_tokens)
            save_tokens(tokens)
        except Exception as e:
            return None, f"Token refresh failed: {e}"
    return tokens['access_token'], None

# ── Strava type → DanOS type mapping ─────────────────────────────
TYPE_MAP = {
    'Run':             'run',
    'VirtualRun':      'run',
    'TrailRun':        'run',
    'Walk':            'walk',
    'Hike':            'hike',
    'Ride':            'cycle',
    'VirtualRide':     'cycle',
    'MountainBikeRide':'cycle',
    'GravelRide':      'cycle',
    'EBikeRide':       'cycle',
    'Swim':            'swim',
    'Yoga':            'yoga',
    'Workout':         'gym',
    'WeightTraining':  'gym',
    'Crossfit':        'hiit',
    'HighIntensityIntervalTraining': 'hiit',
    'Elliptical':      'gym',
    'StairStepper':    'gym',
    'Rowing':          'gym',
    'Kayaking':        'other',
    'Canoeing':        'other',
    'Surfing':         'other',
    'Skateboard':      'other',
    'Soccer':          'other',
    'Tennis':          'other',
    'Badminton':       'other',
    'Squash':          'other',
    'Golf':            'other',
    'Snowboard':       'other',
    'AlpineSki':       'other',
    'NordicSki':       'other',
    'IceSkate':        'other',
    'RockClimbing':    'other',
}

def strava_to_danos(a):
    """Convert a Strava activity object to DanOS activity format."""
    activity_type = TYPE_MAP.get(a.get('sport_type') or a.get('type',''), 'other')
    duration_secs = a.get('moving_time') or a.get('elapsed_time') or 0
    distance_m    = a.get('distance') or 0
    start_date    = a.get('start_date_local') or a.get('start_date') or ''
    date_str      = start_date[:10] if start_date else ''

    return {
        'id':           f"strava_{a['id']}",
        'stravaId':     a['id'],
        'type':         activity_type,
        'stravaType':   a.get('sport_type') or a.get('type',''),
        'name':         a.get('name',''),
        'date':         date_str,
        'duration':     round(duration_secs / 60),   # minutes
        'distance':     round(distance_m / 1000, 2), # km
        'distanceUnit': 'km',
        'calories':     a.get('calories') or a.get('kilojoules') or None,
        'effort':       None,
        'notes':        a.get('description') or '',
        'avgHR':        a.get('average_heartrate'),
        'maxHR':        a.get('max_heartrate'),
        'avgPace':      None,  # computed client-side
        'elevation':    a.get('total_elevation_gain'),
        'source':       'strava',
    }

# ── HTTP Server ───────────────────────────────────────────────────
def json_response(handler, data, status=200):
    body = json.dumps(data).encode()
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json')
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.send_header('Access-Control-Allow-Headers', 'Content-Type')
    handler.send_header('Content-Length', len(body))
    handler.end_headers()
    handler.wfile.write(body)

def error_response(handler, msg, status=400):
    json_response(handler, {'error': msg}, status)

class StravaHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[Strava] {fmt % args}")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path   = parsed.path
        params = dict(urllib.parse.parse_qsl(parsed.query))

        if path == '/health':
            json_response(self, {'status': 'ok', 'connected': bool(load_tokens().get('access_token'))})

        elif path == '/auth-url':
            # Return the OAuth URL for DanOS to redirect the user to
            client_id = params.get('client_id', '')
            if not client_id:
                error_response(self, 'client_id required'); return
            qs = urllib.parse.urlencode({
                'client_id':     client_id,
                'redirect_uri':  REDIRECT_URI,
                'response_type': 'code',
                'approval_prompt': 'auto',
                'scope':         'activity:read_all',
            })
            json_response(self, {'url': f'{STRAVA_AUTH_URL}?{qs}'})

        elif path == '/callback':
            # Strava redirects here after user authorises
            code  = params.get('code','')
            error = params.get('error','')
            if error or not code:
                self._html_page("❌ Strava auth failed", f"Error: {error or 'no code returned'}. Close this tab and try again.")
                return
            # We need client credentials — read from temp file written by DanOS
            creds = load_tokens()
            client_id     = creds.get('client_id','')
            client_secret = creds.get('client_secret','')
            if not client_id or not client_secret:
                self._html_page("❌ Missing credentials", "Client ID/Secret not set. Enter them in DanOS first.")
                return
            try:
                data = urllib.parse.urlencode({
                    'client_id':     client_id,
                    'client_secret': client_secret,
                    'code':          code,
                    'grant_type':    'authorization_code',
                }).encode()
                req = urllib.request.Request(STRAVA_TOKEN_URL, data=data, method='POST')
                with urllib.request.urlopen(req) as r:
                    token_data = json.loads(r.read())
                token_data['client_id']     = client_id
                token_data['client_secret'] = client_secret
                save_tokens(token_data)
                athlete = token_data.get('athlete',{})
                name    = f"{athlete.get('firstname','')} {athlete.get('lastname','')}".strip()
                self._html_page("✅ Connected!", f"Strava connected for {name or 'athlete'}! Close this tab and return to DanOS to sync your activities.")
            except Exception as e:
                traceback.print_exc()
                self._html_page("❌ Token exchange failed", str(e))

        elif path == '/status':
            tokens = load_tokens()
            if tokens.get('access_token'):
                athlete = tokens.get('athlete',{})
                json_response(self, {
                    'connected': True,
                    'athlete': {
                        'name': f"{athlete.get('firstname','')} {athlete.get('lastname','')}".strip(),
                        'username': athlete.get('username',''),
                        'profile': athlete.get('profile_medium') or athlete.get('profile'),
                    }
                })
            else:
                json_response(self, {'connected': False})

        elif path == '/activities':
            client_id     = load_tokens().get('client_id','')
            client_secret = load_tokens().get('client_secret','')
            access_token, err = get_valid_token(client_id, client_secret)
            if err:
                error_response(self, err, 401); return
            try:
                per_page = int(params.get('per_page', 200))
                page     = int(params.get('page', 1))
                after    = params.get('after','')  # unix timestamp to fetch only new ones
                qs_params = {'per_page': per_page, 'page': page}
                if after: qs_params['after'] = after
                qs = urllib.parse.urlencode(qs_params)
                req = urllib.request.Request(
                    f'{STRAVA_API_BASE}/athlete/activities?{qs}',
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                with urllib.request.urlopen(req) as r:
                    raw = json.loads(r.read())
                activities = [strava_to_danos(a) for a in raw]
                json_response(self, {'activities': activities, 'count': len(activities)})
            except Exception as e:
                traceback.print_exc()
                error_response(self, str(e), 500)

        elif path == '/disconnect':
            if os.path.exists(TOKEN_FILE):
                os.remove(TOKEN_FILE)
            json_response(self, {'disconnected': True})

        else:
            error_response(self, 'Not found', 404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path   = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        body   = json.loads(self.rfile.read(length)) if length else {}

        if path == '/credentials':
            # Store client_id and client_secret (needed for OAuth callback)
            client_id     = body.get('client_id','').strip()
            client_secret = body.get('client_secret','').strip()
            if not client_id or not client_secret:
                error_response(self, 'client_id and client_secret required'); return
            tokens = load_tokens()
            tokens['client_id']     = client_id
            tokens['client_secret'] = client_secret
            save_tokens(tokens)
            json_response(self, {'saved': True})
        else:
            error_response(self, 'Not found', 404)

    def _html_page(self, title, message):
        html = f"""<!DOCTYPE html><html><head><title>{title}</title>
<style>body{{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#111;color:#fff}}
h1{{font-size:2rem;margin-bottom:1rem}}p{{font-size:1.1rem;color:#aaa;max-width:500px;text-align:center}}</style></head>
<body><h1>{title}</h1><p>{message}</p></body></html>"""
        body = html.encode()
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    print(f"DanOS Strava Server running on http://localhost:{PORT}")
    print(f"Token file: {TOKEN_FILE}")
    print()
    print("SETUP:")
    print("  1. Go to https://www.strava.com/settings/api")
    print("  2. Create an app — set 'Authorization Callback Domain' to: localhost")
    print("  3. Enter your Client ID and Client Secret in DanOS → Fitness → Strava")
    print("  4. Click 'Connect Strava' — authorise in the browser that opens")
    print("  5. Return to DanOS and click 'Sync activities'")
    print()
    server = HTTPServer(('localhost', PORT), StravaHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
