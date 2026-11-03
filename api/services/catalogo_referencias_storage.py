"""Descoberta das referências operacionais sem alterar trilhas de auditoria."""
from collections import defaultdict
from psycopg.types.json import Json, Jsonb


def colunas_operacionais(conn):
    linhas = conn.execute("""
        SELECT c.table_schema,c.table_name,c.column_name,c.data_type
          FROM information_schema.columns c
         WHERE c.table_schema IN ('geoprocessamento','hierarquizacao_demandas','ahp','geo','demandas')
           AND EXISTS (SELECT 1 FROM information_schema.tables t
                        WHERE t.table_schema=c.table_schema AND t.table_name=c.table_name
                          AND t.table_type='BASE TABLE')
           AND (c.data_type IN ('json','jsonb','text','character varying')
                OR c.column_name IN ('tamanho_bytes','homologado_em','homologado_por','publicado_em','homologado','publicado'))
           AND c.table_name !~ '(auditoria|audit|historico|(^|_)log($|_)|evento)'
         ORDER BY c.table_schema,c.table_name,c.ordinal_position
    """).fetchall()
    pks = conn.execute("""
        SELECT n.nspname AS esquema,t.relname AS tabela,a.attname AS coluna
          FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid
          JOIN pg_namespace n ON n.oid=t.relnamespace
          CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(num,ord)
          JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num
         WHERE i.indisprimary AND n.nspname IN ('geoprocessamento','hierarquizacao_demandas','ahp','geo','demandas')
         ORDER BY n.nspname,t.relname,k.ord
    """).fetchall()
    chaves, tabelas = defaultdict(list), defaultdict(dict)
    for p in pks:
        chaves[(p['esquema'], p['tabela'])].append(p['coluna'])
    for r in linhas:
        tabelas[(r['table_schema'], r['table_name'])][r['column_name']] = r['data_type']
    return tabelas, chaves


def adaptar(valor, tipo):
    return (Jsonb(valor) if tipo == 'jsonb' else Json(valor)) if valor is not None and tipo in {'json', 'jsonb'} else valor
