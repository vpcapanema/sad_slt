"""Catálogo das saídas; o banco guarda referências, o Storage guarda conteúdo."""
from uuid import uuid4
from psycopg.types.json import Jsonb
from api.db.connection import get_connection


def listar(execucao_id: str | None = None) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute('''SELECT c.recurso_sessao_id AS id,c.nome,c.tipo,c.geometria_tipo,
            c.crs,c.formato,c.criado_em,c.operacao_origem AS operacao,c.metadados,
            a.caminho AS arquivo,a.sha256,a.tamanho_bytes,a.execucao_id,
            e.operacao AS ferramenta,e.status AS status_execucao
            FROM geoprocessamento.camada_processada c
            JOIN geoprocessamento.arquivo_resultado a ON a.camada_id=c.id
            JOIN geoprocessamento.execucao_arquivo e ON e.id=a.execucao_id
            WHERE a.estado IN ('temporario','resultado','acervo')
              AND e.status IN ('concluido','regularizacao')
              AND (%s::uuid IS NULL OR e.id=%s::uuid)
            ORDER BY e.iniciado_em DESC,c.criado_em,c.nome''',(execucao_id,execucao_id)).fetchall()
        exports=conn.execute('''SELECT 'saida_exportada_'||a.id::text AS id,
            COALESCE(a.validacao->>'nome',c.nome,a.caminho) AS nome,
            CASE WHEN a.validacao ? 'feicoes' THEN 'vetor' ELSE 'raster' END AS tipo,
            c.geometria_tipo,COALESCE(a.validacao->>'crs',c.crs) AS crs,
            NULL::text AS formato,
            a.criado_em,c.operacao_origem AS operacao,a.validacao AS metadados,
            a.caminho AS arquivo,e.id AS execucao_id,e.operacao AS ferramenta,
            e.status AS status_execucao,'saida_arquivo' AS fonte
            FROM geoprocessamento.arquivo_exportado a
            JOIN geoprocessamento.execucao_arquivo e ON e.id=a.execucao_id
            LEFT JOIN (SELECT recurso_sessao_id,nome,crs,geometria_tipo,operacao_origem FROM geoprocessamento.camada_processada
                UNION ALL SELECT recurso_sessao_id,nome,crs,geometria_tipo,NULL FROM geoprocessamento.camada_importada) c
                ON c.recurso_sessao_id=a.recurso_origem
            WHERE a.caminho LIKE 'saidas-geoespaciais/execucoes/%%/camadas/%%'
              AND a.validacao->>'reaberto_gdal'='true' AND e.status='concluido'
              AND (%s::uuid IS NULL OR e.id=%s::uuid)
            ORDER BY a.criado_em DESC''',(execucao_id,execucao_id)).fetchall()
        rows.extend(exports)
    from api.services.geoprocessamento_engine import CATALOG
    nomes = {**CATALOG, 'OP-MUNICIPAL':'Gerador de camadas municipais',
             'extracao_atributos':'Extração de atributos', 'exportacao_direta':'Exportação de camadas',
             'registro_direto':'Outras saídas', 'regularizacao_legado':'Saídas migradas'}
    result=[]
    for row in rows:
        item=dict(row)
        if item.get('fonte')=='saida_arquivo':
            from pathlib import PurePosixPath
            item['formato']=PurePosixPath(item['arquivo']).suffix.removeprefix('.').upper()
            if item['nome']==item['arquivo']:
                item['nome']=PurePosixPath(item['arquivo']).stem
        item['ferramenta']=nomes.get(item['ferramenta'],item['ferramenta'])
        result.append(item)
    return result


def registrar_documento(execucao: str, origem: str, arquivo: dict, *, validacao: dict | None = None):
    with get_connection() as conn:
        conn.execute('''INSERT INTO geoprocessamento.arquivo_exportado
            (id,execucao_id,recurso_origem,caminho,componentes,validacao)
            VALUES (%s,%s,%s,%s,%s,%s)''',
            (uuid4(),execucao,origem,arquivo['caminho'],Jsonb([arquivo]),Jsonb(validacao or {})))


def arquivos_execucao(execucao: str) -> list[dict]:
    with get_connection() as conn:
        rows=conn.execute('''SELECT caminho,sha256,tamanho_bytes AS bytes
            FROM geoprocessamento.arquivo_resultado WHERE execucao_id=%s AND estado<>'removido'
            UNION ALL SELECT componente->>'caminho',componente->>'sha256',
                (componente->>'tamanho_bytes')::bigint
            FROM geoprocessamento.arquivo_exportado,
                 LATERAL jsonb_array_elements(componentes) componente
            WHERE execucao_id=%s''',(execucao,execucao)).fetchall()
    return [dict(row) for row in rows]


def referencia(caminho: str) -> dict | None:
    """Downloads aceitam somente arquivos conhecidos pela plataforma."""
    with get_connection() as conn:
        row = conn.execute('''SELECT a.caminho,a.sha256,e.responsavel,FALSE AS privado
            FROM geoprocessamento.arquivo_resultado a JOIN geoprocessamento.execucao_arquivo e ON e.id=a.execucao_id
            WHERE a.caminho=%s AND a.estado<>'removido'
            UNION ALL
            SELECT componente->>'caminho',componente->>'sha256',e.responsavel,TRUE
            FROM geoprocessamento.arquivo_exportado a JOIN geoprocessamento.execucao_arquivo e ON e.id=a.execucao_id,
                 LATERAL jsonb_array_elements(a.componentes) componente
            WHERE componente->>'caminho'=%s
            UNION ALL
            SELECT pacote_caminho,pacote_sha256,responsavel,TRUE FROM geoprocessamento.extracao_atributos
            WHERE pacote_caminho=%s
            UNION ALL
            SELECT relatorio_caminho,relatorio->>'relatorio_sha256',responsavel,TRUE FROM geoprocessamento.extracao_atributos
            WHERE relatorio_caminho=%s LIMIT 1''',(caminho,)*4).fetchone()
    return dict(row) if row else None
