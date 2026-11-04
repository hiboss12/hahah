import json, threading, itertools
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LOCK = threading.Lock()
REV = itertools.count(1)

CFG = {
    "larp_target_userid": "", "larp_target_username": "", "larp_target_displayname": "",
    "larp_target_avatar": "", "larp_fake_robux": "0", "larp_verified_badge": "1",
    "larp_notif_count": "0", "larp_messages_count": "0", "larp_connect_count": "0",
    "larp_fake_buying_enabled": "1", "larp_fakewear_enabled": "1",
    "larp_avatar_spoof_enabled": "1", "larp_autoexec_path": "",
}

PANEL = """<!doctype html><meta charset=utf-8><title>Bloxflare</title>
<style>body{font:14px system-ui;background:#111;color:#eee;padding:24px;max-width:520px}
label{display:block;margin:10px 0 3px;color:#9ab}input{width:100%;padding:7px;background:#1c1c1c;
color:#eee;border:1px solid #333;border-radius:4px}button{margin-top:18px;padding:9px 20px;
background:#3b6;color:#000;border:0;border-radius:4px;font-weight:700;cursor:pointer}
#s{margin-top:12px;color:#6c9}</style>
<h2>Bloxflare remote</h2><div id=form></div><button onclick=save()>Push to phone</button>
<div id=s></div><script>
const F=%s;let h='';
for(const k in F)h+=`<label>${k}</label><input id=${k} value="${F[k]??''}">`;
document.getElementById('form').innerHTML=h;
async function save(){const o={};for(const k in F)o[k]=document.getElementById(k).value;
const r=await fetch('/config',{method:'POST',body:JSON.stringify(o)});
document.getElementById('s').textContent=r.ok?'Pushed. Phone applies within 5s.':'Failed.';}
</script>"""


class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def _send(self, code, body, ctype="application/json"):
        b = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/config"):
            with LOCK:
                out = dict(CFG, __rev=next(REV) if False else REV_STATE[0])
            self._send(200, json.dumps(out))
        elif self.path in ("/", "/panel"):
            with LOCK:
                snapshot = dict(CFG)
            self._send(200, PANEL % json.dumps(snapshot), "text/html")
        else:
            self._send(404, '{"error":"not found"}')

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        try:
            data = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return self._send(400, '{"error":"bad json"}')
        if self.path.startswith("/license"):
            return self._send(200, json.dumps(
                {"ok": True, "valid": True, "license": "local", "expires": 9999999999}))
        if self.path.startswith("/config"):
            with LOCK:
                for k, v in data.items():
                    if k in CFG:
                        CFG[k] = str(v)
                REV_STATE[0] = next(REV)
                out = dict(CFG, __rev=REV_STATE[0])
            return self._send(200, json.dumps(out))
        self._send(404, '{"error":"not found"}')


REV_STATE = [0]

if __name__ == "__main__":
    print("config server on http://0.0.0.0:8000  (panel at /)")
    ThreadingHTTPServer(("0.0.0.0", 8000), H).serve_forever()
