from hashlib import sha256
import json
from pathlib import Path
from unittest.mock import Mock

import pytest

from scripts import publicar_tutoriais_storage as publicacao


@pytest.fixture
def fonte(monkeypatch):
    origem = Path("fonte-sintetica")
    arquivos = {}
    html = ['<a href="../../index.html">Hub</a>']
    for numero in range(16):
        base = f"tutorial_{numero:02d}"
        html.append(
            f'<article><h2>Demanda {numero}<small> · Revisão pendente</small></h2>'
            f'<video src="{base}.mp4" poster="{base}_capa.jpg"></video>'
            f'<span>31.57 s · Full HD · 30 fps</span>'
            f'<a href="{base}.mp4">MP4</a><a href="{base}.srt">SRT</a></article>'
        )
        arquivos[origem / f"{base}.mp4"] = b"video"
        arquivos[origem / f"{base}_capa.jpg"] = b"capa"
        arquivos[origem / f"{base}.srt"] = (
            "1\r\n00:00:00,000 --> 00:00:01,500\r\nAção de treinamento\r\n".encode("utf-8")
        )
    html.append('<footer><a href="REVISOES_PENDENTES.txt">Revisões</a>'
                '<a href="CONFERENCIA_STATUS.txt">Conferência</a>'
                '<p>Dados fictícios.</p><p>Não executa índices.</p></footer>')
    arquivos[origem / "REVISOES_PENDENTES.txt"] = b"revisoes"
    arquivos[origem / "CONFERENCIA_STATUS.txt"] = b"conferencia"
    arquivos[origem / "index.html"] = "".join(html).encode("utf-8")
    monkeypatch.setattr(Path, "read_bytes", lambda path: arquivos[path])
    return origem, arquivos


def test_preparacao_preserva_catalogo_unicode_hashes_e_legendas(fonte):
    origem, originais = fonte
    manifest, arquivos = publicacao.preparar(origem)
    assert len(arquivos) == 66
    assert manifest["tutoriais"][0]["titulo"] == "Demanda 0"
    assert manifest["tutoriais"][0]["revisao"] == "Revisão pendente"
    assert manifest["tutoriais"][0]["duracao"] == "31.57 s · Full HD · 30 fps"
    assert manifest["ressalvas"] == ["Dados fictícios.", "Não executa índices."]
    assert manifest["origem_html_sha256"] == sha256(originais[origem / "index.html"]).hexdigest()
    assert arquivos["tutorial_00.srt"] == originais[origem / "tutorial_00.srt"]
    vtt = arquivos["tutorial_00.vtt"].decode("utf-8")
    assert vtt.startswith("WEBVTT\n\n")
    assert "00:00:00.000 --> 00:00:01.500" in vtt
    assert "Ação de treinamento" in vtt
    assert "../../index.html" not in arquivos
    assert "fonte-sintetica" not in json.dumps(manifest)
    for nome, dados in arquivos.items():
        assert manifest["arquivos"][nome] == {"bytes": len(dados), "sha256": sha256(dados).hexdigest()}


def test_fonte_alterada_nao_publica(monkeypatch):
    monkeypatch.setattr(Path, "read_bytes", lambda path: b"<html>Sem catalogo</html>")
    with pytest.raises(ValueError, match="fonte mudou"):
        publicacao.preparar(Path("fonte-sintetica"))


@pytest.mark.parametrize("falha", ["existente", "negado"])
def test_recusa_destino_e_permissao_sem_enviar_arquivos(fonte, monkeypatch, falha):
    origem, _ = fonte
    listar = Mock(return_value=[])
    criar = Mock()
    enviar = Mock()
    if falha == "negado":
        listar.side_effect = FileNotFoundError
        criar.side_effect = publicacao.storage_remoto.StorageIndisponivel("Unable to create directory")
    monkeypatch.setattr(publicacao.storage_remoto, "listar", listar)
    monkeypatch.setattr(publicacao.storage_remoto, "criar_pasta", criar)
    monkeypatch.setattr(publicacao.storage_remoto, "enviar_bytes", enviar)
    destino = Mock(spec=Path)
    with pytest.raises((RuntimeError, publicacao.storage_remoto.StorageIndisponivel)):
        publicacao.publicar(origem, destino)
    if falha == "existente":
        criar.assert_not_called()
    enviar.assert_not_called()
    destino.write_bytes.assert_not_called()


@pytest.mark.parametrize("corromper", [False, True])
def test_publicacao_verifica_todos_arquivos_antes_manifesto_local(fonte, monkeypatch, corromper):
    origem, _ = fonte
    remoto = {}
    def listar(pasta, estrito):
        if not remoto:
            raise FileNotFoundError
        return [{"nome": path.rsplit("/", 1)[-1], "tamanho": len(data)} for path, data in remoto.items()]
    monkeypatch.setattr(publicacao.storage_remoto, "listar", listar)
    monkeypatch.setattr(publicacao.storage_remoto, "criar_pasta", Mock())
    monkeypatch.setattr(publicacao.storage_remoto, "enviar_bytes", lambda path, data: remoto.__setitem__(path, data))
    baixar = Mock(side_effect=lambda path: b"alterado" if corromper else remoto[path])
    monkeypatch.setattr(publicacao.storage_remoto, "baixar", baixar)
    destino = Mock(spec=Path)
    if corromper:
        with pytest.raises(RuntimeError, match="Integridade remota divergente"):
            publicacao.publicar(origem, destino)
        destino.write_bytes.assert_not_called()
    else:
        publicacao.publicar(origem, destino)
        assert len(remoto) == baixar.call_count == 67
        destino.write_bytes.assert_called_once()
        manifest = json.loads(destino.write_bytes.call_args.args[0])
        assert len(manifest["arquivos"]) == 66
