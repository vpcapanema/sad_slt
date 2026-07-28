import hashlib
import json
from pathlib import Path

root = Path(r"d:\REPOSITORIOS\sistema_apoio_a_tomada_de_decisao_web")
inv_path = root / "data" / "geoespacial" / "relatorios" / "inventario_fontes_brutas_fase1.json"
base = root / "data" / "geoespacial" / "local"

inv = json.loads(inv_path.read_text(encoding="utf-8"))
fontes = inv.get("fontes", {})

missing = []
hash_mismatch = []
size_mismatch = []
ok = []

for fid, meta in fontes.items():
    for arq in meta.get("arquivos", []):
        rel = arq.get("caminho")
        p = base / rel
        if not p.exists():
            missing.append(rel)
            continue
        b = p.read_bytes()
        sha = hashlib.sha256(b).hexdigest()
        size = len(b)
        if str(arq.get("sha256", "")).lower() != sha.lower():
            hash_mismatch.append((rel, arq.get("sha256"), sha))
        if int(arq.get("bytes", -1)) != size:
            size_mismatch.append((rel, arq.get("bytes"), size))
        if str(arq.get("sha256", "")).lower() == sha.lower() and int(arq.get("bytes", -1)) == size:
            ok.append(rel)

print("EXPECTED_FILES", sum(len(m.get("arquivos", [])) for m in fontes.values()))
print("OK", len(ok))
print("MISSING", len(missing))
print("HASH_MISMATCH", len(hash_mismatch))
print("SIZE_MISMATCH", len(size_mismatch))

if missing:
    print("-- MISSING_LIST --")
    for i in missing:
        print(i)

if hash_mismatch:
    print("-- HASH_MISMATCH_LIST --")
    for rel, exp, got in hash_mismatch:
        print(rel)
        print(" expected:", exp)
        print(" got     :", got)

if size_mismatch:
    print("-- SIZE_MISMATCH_LIST --")
    for rel, exp, got in size_mismatch:
        print(rel, "expected", exp, "got", got)
