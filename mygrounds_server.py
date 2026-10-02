#!/usr/bin/env python3
"""
DanOS My Grounds Server
========================
Imports your attended games from My Grounds (mygrounds.com) into DanOS.

TWO IMPORT METHODS:
  1. CSV export  — download from mygrounds.com → My Profile → Export, 
                   then POST the file to /import-csv
  2. Profile URL — provide your public My Grounds profile URL and this
                   server will scrape the visited grounds list

Run:  python mygrounds_server.py
Port: http://localhost:5959
"""

import json, re, urllib.request, urllib.parse, traceback, csv, io
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

PORT = 5959

# ── Ground name normaliser ──────────────────────────────────────────
# My Grounds uses slightly different ground/club names than our DEFAULT_92
# Map common variants so visited clubs get matched correctly
GROUND_MAP = {
    'emirates stadium':              'Emirates Stadium',
    'villa park':                    'Villa Park',
    'vitality stadium':              'Vitality Stadium',
    'gtech community stadium':       'Gtech Community Stadium',
    'brentford community stadium':   'Gtech Community Stadium',
    'amex stadium':                  'Amex Stadium',
    'falmer stadium':                'Amex Stadium',
    'stamford bridge':               'Stamford Bridge',
    'selhurst park':                 'Selhurst Park',
    'goodison park':                 'Goodison Park',
    'craven cottage':                'Craven Cottage',
    'portman road':                  'Portman Road',
    'king power stadium':            'King Power Stadium',
    'anfield':                       'Anfield',
    'etihad stadium':                'Etihad Stadium',
    'city of manchester stadium':    'Etihad Stadium',
    'old trafford':                  'Old Trafford',
    "st. james' park":               "St. James' Park",
    "st james' park":                "St. James' Park",
    'st james park':                 "St. James' Park",
    'city ground':                   'City Ground',
    "st. mary's stadium":            "St. Mary's Stadium",
    "st mary's stadium":             "St. Mary's Stadium",
    'tottenham hotspur stadium':     'Tottenham Hotspur Stadium',
    'london stadium':                'London Stadium',
    'molineux':                      'Molineux',
    'molineux stadium':              'Molineux',
    'ewood park':                    'Ewood Park',
    'ashton gate':                   'Ashton Gate',
    'turf moor':                     'Turf Moor',
    'cardiff city stadium':          'Cardiff City Stadium',
    'coventry building society arena':'Coventry Building Society Arena',
    'ricoh arena':                   'Coventry Building Society Arena',
    'pride park':                    'Pride Park Stadium',
    'pride park stadium':            'Pride Park Stadium',
    'mkm stadium':                   'MKM Stadium',
    'kcom stadium':                  'MKM Stadium',
    'elland road':                   'Elland Road',
    'kenilworth road':               'Kenilworth Road',
    'riverside stadium':             'Riverside Stadium',
    'the den':                       'The Den',
    'carrow road':                   'Carrow Road',
    'kassam stadium':                'Kassam Stadium',
    'home park':                     'Home Park',
    'fratton park':                  'Fratton Park',
    'deepdale':                      'Deepdale',
    'loftus road':                   'Loftus Road',
    'bramall lane':                  'Bramall Lane',
    'bet365 stadium':                'Bet365 Stadium',
    'britannia stadium':             'Bet365 Stadium',
    'stadium of light':              'Stadium of Light',
    'swansea.com stadium':           'Swansea.com Stadium',
    'liberty stadium':               'Swansea.com Stadium',
    'vicarage road':                 'Vicarage Road',
    'the hawthorns':                 'The Hawthorns',
    'hillsborough':                  'Hillsborough',
    "st andrew's":                   "St Andrew's",
    'oakwell':                       'Oakwell',
    'bloomfield road':               'Bloomfield Road',
    'toughsheet community stadium':  'Toughsheet Community Stadium',
    'university of bolton stadium':  'Toughsheet Community Stadium',
    'memorial stadium':              'Memorial Stadium',
    'pirelli stadium':               'Pirelli Stadium',
    'abbey stadium':                 'Abbey Stadium',
    'the valley':                    'The Valley',
    'st james park':                 'St James Park',
    "john smith's stadium":          "John Smith's Stadium",
    'lner stadium':                  'LNER Stadium',
    'sincil bank':                   'LNER Stadium',
    'stadium mk':                    'Stadium MK',
    'sixfields':                     'Sixfields Stadium',
    'london road':                   'London Road',
    'select car leasing stadium':    'Select Car Leasing Stadium',
    'madejski stadium':              'Select Car Leasing Stadium',
    'new york stadium':              'New York Stadium',
    'croud meadow':                  'Croud Meadow',
    'new meadow':                    'Croud Meadow',
    'lamex stadium':                 'Lamex Stadium',
    'broadhall way':                 'Lamex Stadium',
    'dw stadium':                    'DW Stadium',
    'racecourse ground':             'Racecourse Ground',
    'edgeley park':                  'Edgeley Park',
    'adams park':                    'Adams Park',
    'brisbane road':                 'Brisbane Road',
    'broadfield stadium':            'Broadfield Stadium',
    'plough lane':                   'Plough Lane',
    'wham stadium':                  'Wham Stadium',
    'crown ground':                  'Wham Stadium',
    'valley parade':                 'Valley Parade',
    'hayes lane':                    'Hayes Lane',
    'brunton park':                  'Brunton Park',
    'jonny-rocks stadium':           'Jonny-Rocks Stadium',
    'whaddon road':                  'Jonny-Rocks Stadium',
    'smh group stadium':             'SMH Group Stadium',
    'recreation ground':             'SMH Group Stadium',
    'jobserve community stadium':    'JobServe Community Stadium',
    'layer road':                    'JobServe Community Stadium',
    'alexandra stadium':             'Alexandra Stadium',
    'gresty road':                   'Alexandra Stadium',
    'eco-power stadium':             'Eco-Power Stadium',
    'keepmoat stadium':              'Eco-Power Stadium',
    'highbury stadium':              'Highbury Stadium',
    'priestfield stadium':           'Priestfield Stadium',
    'blundell park':                 'Blundell Park',
    'the envirovent stadium':        'The EnviroVent Stadium',
    'wetherby road':                 'The EnviroVent Stadium',
    'mazuma mobile stadium':         'Mazuma Mobile Stadium',
    'christie park':                 'Mazuma Mobile Stadium',
    'rodney parade':                 'Rodney Parade',
    'meadow lane':                   'Meadow Lane',
    'vale park':                     'Vale Park',
    'peninsula stadium':             'Peninsula Stadium',
    'moor lane':                     'Peninsula Stadium',
    'county ground':                 'County Ground',
    'prenton park':                  'Prenton Park',
    'poundland bescot stadium':      'Poundland Bescot Stadium',
    'bescot stadium':                'Poundland Bescot Stadium',
    'wembley stadium':               'Wembley Stadium',
    'wembley':                       'Wembley Stadium',
}

def normalise_ground(name):
    return GROUND_MAP.get(name.lower().strip(), name.strip())

def parse_date(s):
    """Try multiple date formats and return YYYY-MM-DD."""
    if not s: return ''
    for fmt in ('%d/%m/%Y','%Y-%m-%d','%d-%m-%Y','%d %B %Y','%B %d, %Y','%d/%m/%y'):
        try: return datetime.strptime(s.strip(), fmt).strftime('%Y-%m-%d')
        except: pass
    return s.strip()

# ── CSV parser ──────────────────────────────────────────────────────
def parse_mygrounds_csv(text):
    """
    Parse a My Grounds CSV export.
    Expected columns (My Grounds export format):
      Date, Home, Away, Score, Ground, Competition, Country, Notes
    Returns list of DanOS game dicts.
    """
    games = []
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        # Normalise keys (My Grounds sometimes uses different capitalisation)
        r = {k.strip().lower(): v.strip() for k, v in row.items()}

        score_raw = r.get('score','') or r.get('result','')
        home_score, away_score = '', ''
        if '-' in score_raw:
            parts = score_raw.split('-')
            if len(parts) == 2:
                home_score = parts[0].strip()
                away_score = parts[1].strip()

        ground_raw = r.get('ground','') or r.get('stadium','') or r.get('venue','')
        ground = normalise_ground(ground_raw)

        game = {
            'id':          f"mg_{abs(hash(str(r)))}",
            'date':        parse_date(r.get('date','')),
            'home':        r.get('home','') or r.get('home team',''),
            'away':        r.get('away','') or r.get('away team',''),
            'homeScore':   home_score,
            'awayScore':   away_score,
            'ground':      ground,
            'competition': r.get('competition','') or r.get('comp',''),
            'country':     r.get('country','England'),
            'notes':       r.get('notes','') or r.get('note',''),
            'source':      'mygrounds',
        }
        if game['home'] or game['ground']:
            games.append(game)

    return games

# ── Profile scraper ─────────────────────────────────────────────────
def scrape_profile(url):
    """
    Attempt to scrape a public My Grounds profile page.
    Returns list of {ground, club, date} dicts.
    """
    try:
        req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            html = r.read().decode('utf-8', errors='replace')
    except Exception as e:
        return None, f"Could not fetch profile: {e}"

    # My Grounds profile pages list grounds in a table or list
    # Extract ground names using simple regex patterns
    grounds = []

    # Pattern 1: table rows with ground/club data
    rows = re.findall(r'<tr[^>]*>.*?</tr>', html, re.DOTALL)
    for row in rows:
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)
        cells = [re.sub(r'<[^>]+>','',c).strip() for c in cells]
        cells = [c for c in cells if c]
        if len(cells) >= 2:
            # Try to find date-like cell and ground-like cell
            date_cell = ''
            ground_cell = ''
            for c in cells:
                if re.match(r'\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}', c):
                    date_cell = c
                elif len(c) > 5 and not c.isdigit():
                    ground_cell = c
            if ground_cell:
                grounds.append({'ground': normalise_ground(ground_cell), 'date': parse_date(date_cell), 'raw': cells})

    # Pattern 2: list items
    if not grounds:
        items = re.findall(r'<li[^>]*class="[^"]*ground[^"]*"[^>]*>(.*?)</li>', html, re.DOTALL)
        for item in items:
            text = re.sub(r'<[^>]+>','',item).strip()
            if text:
                grounds.append({'ground': normalise_ground(text), 'date': '', 'raw': text})

    if not grounds:
        return None, "Could not find any grounds data in the profile page. Try the CSV export method instead."

    return grounds, None

# ── HTTP Server ─────────────────────────────────────────────────────
def json_response(handler, data, status=200):
    body = json.dumps(data).encode()
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json')
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.send_header('Access-Control-Allow-Headers', 'Content-Type')
    handler.send_header('Content-Length', len(body))
    handler.end_headers()
    handler.wfile.write(body)

class MyGroundsHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[MyGrounds] {fmt % args}")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = dict(urllib.parse.parse_qsl(parsed.query))

        if path == '/health':
            json_response(self, {'status': 'ok'})

        elif path == '/scrape-profile':
            url = params.get('url','').strip()
            if not url:
                json_response(self, {'error': 'url parameter required'}, 400); return
            if not url.startswith('http'):
                url = 'https://' + url
            grounds, err = scrape_profile(url)
            if err:
                json_response(self, {'error': err}, 400)
            else:
                json_response(self, {'grounds': grounds, 'count': len(grounds)})
        else:
            json_response(self, {'error': 'Not found'}, 404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(length)

        if path == '/import-csv':
            content_type = self.headers.get('Content-Type','')
            if 'application/json' in content_type:
                body = json.loads(raw)
                csv_text = body.get('csv','')
            else:
                csv_text = raw.decode('utf-8', errors='replace')

            if not csv_text.strip():
                json_response(self, {'error': 'No CSV data provided'}, 400); return

            try:
                games = parse_mygrounds_csv(csv_text)
                json_response(self, {'games': games, 'count': len(games)})
            except Exception as e:
                traceback.print_exc()
                json_response(self, {'error': f'Parse error: {e}'}, 400)

        else:
            json_response(self, {'error': 'Not found'}, 404)

if __name__ == '__main__':
    print(f"DanOS My Grounds Server — http://localhost:{PORT}")
    print()
    print("IMPORT METHODS:")
    print()
    print("  Method 1 — CSV Export (recommended):")
    print("    1. Go to mygrounds.com → log in → My Profile → Export")
    print("    2. Download the CSV file")
    print("    3. Open DanOS → 92 Club → Import tab → paste CSV or upload file")
    print()
    print("  Method 2 — Profile URL scrape:")
    print("    1. Go to mygrounds.com → your public profile page")
    print("    2. Copy the URL")
    print("    3. Open DanOS → 92 Club → Import tab → enter URL → Scrape")
    print()
    server = HTTPServer(('localhost', PORT), MyGroundsHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
