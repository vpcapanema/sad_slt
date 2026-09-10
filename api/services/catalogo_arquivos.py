"""Conciliação não destrutiva do catálogo com os arquivos deste servidor."""
from __future__ import annotations

import json
import os
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from api.path_policy import project_path
from api.repositories import camada_geoespacial_repository as repo
from api.db.connection import get_connection
from psycopg import sql
from psycopg.types.json import Jsonb

ROOTS = {
    "operacionais": "data/geoespacial/uploads/datastorage",
    "saidas_processadas": "data/geoespacial/outputs",
    "biblioteca_canonica": "data/geoespacial/biblioteca_canonica",
}
EXTENSIONS = {".shp", ".gpkg", ".geojson", ".kml", ".gml", ".fgb", ".tif", ".tiff", ".img", ".asc", ".vrt", ".jp2"}


def caminho_seguro(root: Path, value: str) -> Path | None:
    value = value.replace("\\", "/")
    if not value.startswith("data/geoespacial/") or ".." in value.split("/"):
        return None
    path = (root / value).resolve()
    return path if path.is_relative_to((root / "data/geoespacial").resolve()) else None


def referencias(row: dict, categoria: str) -> list[str]:
    """O snapshot homologado não usa o arquivo da camada que lhe deu origem."""
    metadata = row.get("metadados") or {}
    if categoria == "homologadas":
        return [
            f"data/geoespacial/biblioteca_canonica/{repo._slugify(row.get('modulo_consumidor'))}/"
            f"{repo._slugify(row.get('nome_publicacao'))}_{repo._slugify(row.get('versao'))}"
            + (".tif" if row.get("tipo") == "raster" else ".gpkg")
        ]
    nested = metadata.get("metadados") or {}
    # arquivo_original pode ser pacote/pasta de origem, não o dataset atual.
    values = [metadata.get("caminho_arquivo"), nested.get("caminho_arquivo")]
    return list(dict.fromkeys(str(v).replace("\\", "/") for v in values if v))


def conciliar(directory: dict, root: Path, *, inventariar: bool = True) -> dict:
    layers, files, errors = [], [], []
    linked: dict[str, list[str]] = {}
    for category, rows in directory.items():
        for row in rows:
            refs = referencias(row, category)
            present = [p for p in refs if (q := caminho_seguro(root, p)) and q.is_file()]
            status = "disponivel" if present else "arquivo_nao_localizado" if refs else "sem_vinculo_arquivo"
            current = present[0] if present else (refs[0] if refs else None)
            layer = {**row, "categoria_catalogo": category, "arquivo": current,
                     "referencias": refs, "situacao": status, "registrada": True,
                     "referencias_divergentes": len(refs) > 1}
            metadata = row.get("metadados") or {}
            nested = metadata.get("metadados") or {}
            layer["normalizavel"] = category != "homologadas" and len(present) == 1 and (
                metadata.get("caminho_arquivo") != current or nested.get("caminho_arquivo") != current
            )
            layers.append(layer)
            for ref in refs:
                linked.setdefault(ref, []).append(row["id"])
    for group, relative in (ROOTS.items() if inventariar else ()):
        base = root / relative
        if not base.exists():
            continue
        def on_error(error):
            errors.append(f"Não foi possível ler: {Path(error.filename).name}")
        for folder, dirs, names in os.walk(base, onerror=on_error, followlinks=False):
            dirs[:] = sorted(d for d in dirs if not d.startswith(".") and not (Path(folder)/d).is_symlink())
            for name in sorted(names):
                p = Path(folder) / name
                if p.suffix.lower() not in EXTENSIONS | {".json"} or p.is_symlink():
                    continue
                if p.suffix.lower() == ".json":
                    try:
                        data = json.loads(p.read_text(encoding="utf-8"))
                        if not isinstance(data, dict) or data.get("type") not in {"FeatureCollection", "Feature"}:
                            continue
                    except (ValueError, OSError):
                        continue
                rel = p.relative_to(root).as_posix()
                ids = linked.get(rel, [])
                try:
                    size = p.stat().st_size
                except OSError:
                    errors.append(f"Não foi possível ler: {rel}")
                    continue
                files.append({"arquivo": rel, "nome": p.stem, "grupo": group,
                              "formato": p.suffix[1:].upper(), "tamanho_bytes": size,
                              "camadas_ids": ids, "registrada": bool(ids),
                              "situacao": "registrado" if ids else "aguardando_registro"})
    return {"camadas": layers, "arquivos": files, "erros_leitura": errors,
            "resumo": dict(Counter(x["situacao"] for x in layers)),
            "arquivos_sem_registro": sum(not x["registrada"] for x in files),
            "escopo": "Banco configurado e arquivos do servidor que respondeu à consulta. Existência não substitui validação de conteúdo."}


def obter_conciliacao() -> dict:
    report = conciliar(repo.listar_diretorio(), project_path("."))
    with get_connection() as conn:
        managed = {str(r['camada_id']): dict(r) for r in conn.execute(
            'SELECT a.*,c.recurso_sessao_id FROM geoprocessamento.arquivo_resultado a '
            'JOIN geoprocessamento.camada_processada c ON c.id=a.camada_id').fetchall()}
        exports = {r['caminho']:dict(r) for r in conn.execute(
            'SELECT caminho,execucao_id,recurso_origem FROM geoprocessamento.arquivo_exportado').fetchall()}
    by_resource = {r['recurso_sessao_id']:r for r in managed.values()}
    for layer in report['camadas']:
        item = by_resource.get(layer['id'])
        if item:
            layer.update(estado_arquivo=item['estado'],execucao_id=str(item['execucao_id']),
                         arquivo_resultado_id=str(item['id']),sha256=item['sha256'],normalizavel=False)
    for item in report['arquivos']:
        if item['arquivo'] in exports:
            item.update(registrada=True,situacao='exportacao_registrada',**exports[item['arquivo']])
    report['arquivos_sem_registro'] = sum(not f['registrada'] for f in report['arquivos'])
    return report


def camadas_dos_arquivos(caminhos: set[str]) -> list[dict]:
    """Consulta vínculos dos arquivos visíveis sem inventariar o storage inteiro."""
    if not caminhos:
        return []
    queries = []
    params = []
    for category, (table, _, _) in repo.STORAGES.items():
        canonical = category == "homologadas"
        fields = "c.nome_publicacao,c.modulo_consumidor,c.versao" if canonical else "NULL AS nome_publicacao,NULL AS modulo_consumidor,NULL AS versao"
        join = " LEFT JOIN geoprocessamento.arquivo_resultado a ON a.camada_id=c.id" if category == "processadas" else ""
        state = "a.estado" if category == "processadas" else "NULL::text"
        # A biblioteca homologada não guarda data de criação; as demais guardam.
        created = "NULL::timestamptz" if canonical else "c.criado_em"
        where = "" if canonical else " WHERE replace(c.metadados->>'caminho_arquivo',chr(92),'/') = ANY(%s) OR replace(c.metadados->'metadados'->>'caminho_arquivo',chr(92),'/') = ANY(%s)"
        queries.append(sql.SQL(
            "SELECT %s::text AS categoria,c.recurso_sessao_id AS id,c.nome,c.tipo,c.metadados,"
            + fields + "," + state + " AS estado_arquivo," + created
            + " AS criado_em FROM geoprocessamento.{} c" + join + where
        ).format(sql.Identifier(table)))
        params.append(category)
        if not canonical:
            params.extend([list(caminhos), list(caminhos)])
    with get_connection() as conn:
        rows = conn.execute(sql.SQL(" UNION ALL ").join(queries), params).fetchall()
    directory = {category: [] for category in repo.STORAGES}
    for row in rows:
        if row["estado_arquivo"] not in {"temporario", "removido"} and caminhos.intersection(referencias(row, row["categoria"])):
            directory[row["categoria"]].append(dict(row))
    layers = conciliar(directory, project_path("."), inventariar=False)["camadas"]
    return [row for row in layers if row["arquivo"] in caminhos and row["situacao"] == "disponivel"]


def normalizar_vinculo(category: str, resource_id: str, responsible: str) -> dict:
    """Normaliza apenas caminho já registrado, único e existente; nunca busca por nome."""
    if category not in {"importadas", "processadas"}:
        raise ValueError("Somente vínculos de importadas e processadas podem ser normalizados.")
    table = repo.STORAGES[category][0]
    with get_connection() as conn:
        row = conn.execute(sql.SQL("SELECT id,metadados FROM geoprocessamento.{} WHERE recurso_sessao_id=%s FOR UPDATE").format(sql.Identifier(table)), (resource_id,)).fetchone()
        if not row:
            raise ValueError("Registro não encontrado.")
        if (row['metadados'] or {}).get('arquivo_resultado_id'):
            raise ValueError('O vínculo deste resultado é controlado pelo registro de arquivos e não pode ser normalizado separadamente.')
        refs = referencias(dict(row), category)
        present = [p for p in refs if (q := caminho_seguro(project_path("."), p)) and q.is_file()]
        if len(present) != 1:
            raise ValueError("Não há um único caminho registrado e existente. Conciliação manual necessária.")
        target = present[0]
        metadata = dict(row["metadados"] or {})
        nested = dict(metadata.get("metadados") or {})
        before = {"principal": metadata.get("caminho_arquivo"), "interno": nested.get("caminho_arquivo")}
        if all(v == target for v in before.values()):
            return {"alterado": False, "arquivo": target}
        history = list(metadata.get("historico_conciliacao") or [])
        history.append({"em": datetime.now(timezone.utc).isoformat(), "responsavel": responsible,
                        "antes": before, "depois": target, "criterio": "caminho ja registrado e existente"})
        metadata.update(caminho_arquivo=target, historico_conciliacao=history)
        nested["caminho_arquivo"] = target
        metadata["metadados"] = nested
        conn.execute(sql.SQL("UPDATE geoprocessamento.{} SET metadados=%s WHERE id=%s").format(sql.Identifier(table)), (Jsonb(metadata), row["id"]))
    return {"alterado": True, "arquivo": target}


def listar_diretorio() -> dict:
    report = obter_conciliacao()
    result = {key: [] for key in ROOTS}
    for layer in report["camadas"]:
        if layer["situacao"] != "disponivel" or layer.get('estado_arquivo') in {'temporario','removido'}:
            continue
        if layer.get('estado_arquivo') == 'acervo':
            result['operacionais'].append({**layer,'origem_diretorio':'operacionais','pasta':'Resultados publicados'})
            continue
        path = layer["arquivo"]
        for group, base in ROOTS.items():
            if path.startswith(base + "/"):
                parts = Path(path).relative_to(base).parts
                result[group].append({**layer, "origem_diretorio": group,
                                      "pasta": parts[1] if group == "operacionais" and len(parts) > 2 else None})
                break
    # Contrato anterior preservado; sem arquivo órfão nos seletores comuns.
    for category in ("importadas", "processadas", "homologadas"):
        result[category] = [r for r in report["camadas"] if r["categoria_catalogo"] == category and r.get('estado_arquivo') not in {'temporario','removido'}]
    result["banco_disponivel"] = True
    return result
