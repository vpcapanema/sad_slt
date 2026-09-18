"""Tipologias do catálogo SLT: vínculo com modais e ids já gravados em demandas."""
import json
from pathlib import Path

CATALOGO = Path(__file__).resolve().parents[1] / "config" / "catalogo-slt.json"

# Ids que demandas já gravadas podem referenciar; não podem sumir nem mudar.
IDS_HISTORICOS = {
    "TIP-OBRA", "TIP-DUP", "TIP-REAT", "TIP-TERM", "TIP-HIDR",
    "TIP-PORT", "TIP-EST", "TIP-CONS", "TIP-DIG",
}


def _catalogo() -> dict:
    return json.loads(CATALOGO.read_text(encoding="utf-8"))


def test_ids_historicos_de_tipologia_continuam_no_catalogo() -> None:
    ids = {t["id"] for t in _catalogo()["tipologias"]}
    assert IDS_HISTORICOS <= ids


def test_tipologias_tem_ids_unicos_e_modal_ids_validos() -> None:
    cat = _catalogo()
    modais = {m["id"] for m in cat["modais"]}
    ids = [t["id"] for t in cat["tipologias"]]
    assert len(ids) == len(set(ids))
    for t in cat["tipologias"]:
        assert isinstance(t.get("modal_ids"), list), t["id"]
        assert set(t["modal_ids"]) <= modais, t["id"]


def test_todo_modal_tem_tipologia_especifica_e_ha_transversais() -> None:
    cat = _catalogo()
    ativos = [t for t in cat["tipologias"] if t["ativo"] == "SIM"]
    assert any(not t["modal_ids"] for t in ativos)
    for m in cat["modais"]:
        assert any(m["id"] in t["modal_ids"] for t in ativos), m["id"]
