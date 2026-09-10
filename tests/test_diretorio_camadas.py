"""O inventário de camadas reconhece o que está registrado e não inventa vínculo.

Dois defeitos que se somavam na página de insumos geoespaciais:

1. o cruzamento arquivo↔registro não alcançava o dataset de dentro do pacote
   (`…zip.contents/base.shp`), e tudo aparecia como não registrado;
2. a varredura percorria `geodatabase`, categoria que deixou de existir quando
   `.gpkg` passou a ser classificado como vetor pelas duas portas.

A conciliação saiu de `api/routers/geoespacial.py` para
`api/services/catalogo_arquivos.py` e deixou de varrer categoria por categoria.
Por isso estes testes exercitam o comportamento de `conciliar`, e não o texto
do módulo: é o resultado que precisa continuar valendo, não o formato do código.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from api.path_policy import GEO_OUTPUT_CATEGORIES
from api.services.catalogo_arquivos import EXTENSIONS, conciliar

RAIZ = Path("data/geoespacial/uploads/datastorage")
ACERVO = "data/geoespacial/uploads/datastorage/vetor/PACOTE"


def _registro(ident: str, caminho: str) -> dict:
    return {"id": ident, "nome": f"Camada {ident}", "tipo": "vetor",
            "metadados": {"caminho_arquivo": caminho}}


def _arvore(tmp_path: Path, *relativos: str) -> Path:
    for relativo in relativos:
        alvo = tmp_path / relativo
        alvo.parent.mkdir(parents=True, exist_ok=True)
        alvo.write_bytes(b"conteudo")
    return tmp_path


def test_categoria_morta_saiu_e_gpkg_e_dataset_comum():
    """`geodatabase` não é categoria e `.gpkg` é varrido como qualquer vetor."""
    assert "geodatabase" not in GEO_OUTPUT_CATEGORIES
    assert ".gpkg" in EXTENSIONS


def test_cruzamento_casa_registro_com_o_dataset_dentro_do_pacote(tmp_path):
    """O dataset mora em `…zip.contents/`; o registro aponta para ele."""
    dataset = f"{ACERVO}/base.zip.contents/base.shp"
    raiz = _arvore(tmp_path, dataset)

    relatorio = conciliar({"importadas": [_registro("1", dataset)],
                           "processadas": [], "homologadas": []}, raiz)

    camada = relatorio["camadas"][0]
    assert camada["situacao"] == "disponivel"
    assert camada["arquivo"] == dataset
    arquivo = next(item for item in relatorio["arquivos"] if item["arquivo"] == dataset)
    assert arquivo["registrada"] and arquivo["camadas_ids"] == ["1"]


def test_registro_e_arquivo_nao_se_atraem_por_semelhanca_de_nome(tmp_path):
    """Vínculo só existe por caminho registrado — nunca por nome parecido."""
    presente = f"{ACERVO}/base.gpkg"
    raiz = _arvore(tmp_path, presente)
    ausente = f"{ACERVO}/base.shp"

    relatorio = conciliar({"importadas": [_registro("1", ausente)],
                           "processadas": [], "homologadas": []}, raiz)

    camada = relatorio["camadas"][0]
    assert camada["situacao"] == "arquivo_nao_localizado"
    assert camada["arquivo"] == ausente
    arquivo = next(item for item in relatorio["arquivos"] if item["arquivo"] == presente)
    assert not arquivo["registrada"]
    assert arquivo["situacao"] == "aguardando_registro"
    assert relatorio["arquivos_sem_registro"] == 1


@pytest.mark.skipif(not RAIZ.exists(), reason="acervo ausente neste ambiente")
def test_acervo_nao_tem_categoria_morta():
    presentes = {
        item.name for item in RAIZ.iterdir()
        if item.is_dir() and not item.name.startswith(".")
    }
    invalidas = presentes - set(GEO_OUTPUT_CATEGORIES)
    assert not invalidas, (
        "categoria fora da política de caminhos — arquivo ali fica invisível "
        f"para toda varredura: {sorted(invalidas)}"
    )


def test_script_de_layout_legado_foi_removido():
    """Ele normalizava arquivos soltos na raiz da categoria, hoje proibidos."""
    assert not Path("scripts/normalizar_camadas_existentes.py").exists()
