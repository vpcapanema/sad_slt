import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from api.services.session_service import SessionUser, create_token
import urllib.request
u = SessionUser(id="dev-operator", email="dev@slt.local", username="dev_operador", nome="Dev Operador", tipo_usuario="OPERADOR")
cookie = "slt_session=" + create_token(u)
req = urllib.request.Request(
    "http://127.0.0.1:8080/api/geoespacial/fluxos/fluxo_fase1_gerador_risco_restricao_pli",
    method="DELETE",
    headers={"Cookie": cookie},
)
with urllib.request.urlopen(req, timeout=60) as r:
    print("DELETE status:", r.status, r.read().decode("utf-8"))
