import json
from pathlib import Path

import urllib.request
from api.services.session_service import SessionUser, create_token

BASE = "http://127.0.0.1:8080"

user = SessionUser(
    id="dev-operator",
    email="dev@slt.local",
    username="dev_operador",
    nome="Dev Operador",
    tipo_usuario="OPERADOR",
)
token = create_token(user)
cookies = {"slt_session": token}

req = urllib.request.Request(f"{BASE}/api/geoespacial/camadas-diretorio")
cookie_header = "; ".join(f"{k}={v}" for k, v in cookies.items())
req.add_header("Cookie", cookie_header)
with urllib.request.urlopen(req, timeout=60) as resp:
    print("status", resp.status)
    payload = json.loads(resp.read().decode("utf-8"))

cand = []
for group in ("operacionais", "biblioteca_canonica", "saidas_processadas", "importadas", "processadas", "homologadas"):
    for item in payload.get(group, []) or []:
        text = " ".join([
            str(item.get("id", "")),
            str(item.get("nome", "")),
            str(item.get("arquivo", "")),
            str(item.get("recurso_sessao_id", "")),
        ]).lower()
        if "uf_sp" in text or "br_uf" in text or "sao paulo" in text:
            cand.append((group, item.get("id"), item.get("nome"), item.get("arquivo"), item.get("recurso_sessao_id")))

print("candidatos", len(cand))
for c in cand:
    print(c)
