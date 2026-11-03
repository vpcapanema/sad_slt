"""Reorganiza o acervo na montagem oficial; sem --aplicar apenas confere o plano."""
from __future__ import annotations

import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import datetime, timezone
from hashlib import sha256
import json
from io import BytesIO
import logging
import os
from pathlib import Path, PurePosixPath
import re
from uuid import NAMESPACE_URL, UUID, uuid4, uuid5
import zipfile

import psycopg
from psycopg import sql
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb, Json

from api.config import get_settings
from api.storage_policy import raiz_escrita, publicar_arquivo
from api.services import storage_remoto
from api.services.saidas_storage import pasta_analise, pasta_execucao
from api.services.remapeamento_storage import Remapeamento

LOG = logging.getLogger(__name__)
CONFIG = 'aplicacao/data/geoespacial/configuracoes'
JOBS = CONFIG + '/extracao-atributos/execucoes-elegibilidade'
ORGANIZADAS = {'hierarquizacoes', 'analises-avulsas', 'exportacoes'}


def assinatura(data: bytes) -> str:
    return sha256(data).hexdigest()


def caminho_fisico(root: Path, caminho: str) -> Path:
    partes = PurePosixPath(caminho)
    if partes.is_absolute() or '..' in partes.parts or '\\' in caminho or str(partes) != caminho:
        raise ValueError('Caminho de Storage inválido: ' + caminho)
    p = root.joinpath(*partes.parts)
    if not p.resolve().is_relative_to(root.resolve()) or p.is_symlink():
        raise ValueError('Caminho fora da montagem ou link simbólico: ' + caminho)
    return p


def metadados_gpkg(path: Path, chave: str) -> dict:
    from osgeo import gdal
    gdal.UseExceptions()
    ds = gdal.OpenEx(str(path), gdal.OF_VECTOR)
    for indice in range(ds.GetLayerCount()):
        valor = ds.GetLayerByIndex(indice).GetMetadataItem(chave)
        if valor:
            return json.loads(valor)
    return {}


def codigo_normalizacao(auditoria: dict, codigos: set[str]) -> str | None:
    codigo = auditoria.get('hierarquizacao') or auditoria.get('origem', {}).get('hierarquizacao')
    if codigo:
        if codigo not in codigos:
            raise ValueError('Hierarquização da normalização não existe: ' + str(codigo))
        return codigo
    return None


def escolher_historico(antigo: bytes, vigente: bytes) -> bytes:
    anterior, atual = json.loads(antigo), json.loads(vigente)
    antes, depois = anterior.get('resultado', {}), atual.get('resultado', {})
    registro_anterior = antes.pop('registrado_em', None)
    registro_atual = depois.pop('registrado_em', None)
    if (anterior != atual or anterior.get('status') != 'concluido'
            or not registro_anterior or not registro_atual
            or datetime.fromisoformat(registro_atual) < datetime.fromisoformat(registro_anterior)):
        raise ValueError('Históricos conflitantes; nenhuma versão será sobrescrita.')
    return vigente


def destinos(root: Path, conn) -> tuple[dict[str, str], dict[str, bytes], dict[str, bytes]]:
    saidas = root / 'saidas-geoespaciais'
    arquivos = sorted(p for p in saidas.rglob('*') if p.is_file())
    if any(p.is_symlink() for p in saidas.rglob('*')):
        raise ValueError('Há links simbólicos no acervo; migração interrompida.')
    codigos = {r['codigo'] for r in conn.execute(
        'SELECT codigo FROM hierarquizacao_demandas.hierarquizacao_portfolio')}
    execucoes = {str(r['id']): r for r in conn.execute(
        'SELECT id,operacao,parametros,iniciado_em FROM geoprocessamento.execucao_arquivo')}
    exportados = {r['caminho']: r for r in conn.execute(
        'SELECT id,caminho,execucao_id FROM geoprocessamento.arquivo_exportado')}
    mapa, originais, pastas = {}, {}, {}
    normalizacoes = {}
    elegiveis = {}
    for p in arquivos:
        relativo = p.relative_to(root).as_posix()
        partes = PurePosixPath(relativo).parts
        if len(partes) > 2 and partes[1] in ORGANIZADAS:
            continue
        originais[relativo] = p.read_bytes()
        if partes[1] == 'execucoes':
            ident = str(UUID(partes[2]))
            if ident not in pastas:
                if ident in execucoes:
                    pastas[ident] = pasta_execucao(ident, conn=conn)
                else:
                    LOG.warning('Execução sem registro preservada como análise legada: %s', ident)
                    pastas[ident] = pasta_analise('geoprocessamento-legado', 'execucao-legada', ident, conn=conn)
            mapa[relativo] = pastas[ident] + '/' + p.name
            if p.suffix.lower() == '.gpkg' and p.name.startswith('demandas_normalizadas'):
                normalizacoes[relativo] = metadados_gpkg(p, 'SICARD_NORMALIZACAO')
        elif re.fullmatch(r'elegibilidade-[a-f0-9]{32}', partes[1]) and p.suffix.lower() == '.gpkg':
            elegiveis[relativo] = metadados_gpkg(p, 'SICARD_ELEGIBILIDADE')
        elif len(partes) == 2:
            registro = exportados.get(relativo)
            if not registro or not registro['execucao_id']:
                raise ValueError('Arquivo solto sem vínculo verificável: ' + relativo)
            mapa[relativo] = pasta_execucao(str(registro['execucao_id']), conn=conn) + '/' + p.name
        elif partes[1] not in {'elegibilidade-execucoes', 'elegibilidade-revisoes',
                                'relatorios-elegibilidade'} and not re.fullmatch(
                                    r'elegibilidade-[a-f0-9]{32}', partes[1]):
            raise ValueError('Origem não prevista: ' + relativo)
    for relativo, auditoria in normalizacoes.items():
        codigo = codigo_normalizacao(auditoria, codigos)
        if codigo:
            ident = PurePosixPath(relativo).parts[2]
            pasta = pasta_analise('elegibilidade-territorial', 'preparacao-demandas', ident,
                                  quando=execucoes[ident]['iniciado_em'],
                                  hierarquizacao=codigo, fase='fase-1', conn=conn)
            prefixo = f'saidas-geoespaciais/execucoes/{ident}/'
            for origem in mapa:
                if origem.startswith(prefixo):
                    mapa[origem] = pasta + '/' + PurePosixPath(origem).name
    jobs, arquivos_jobs = {}, {}
    for relativo, conteudo in originais.items():
        if PurePosixPath(relativo).parts[1] == 'elegibilidade-execucoes':
            job = json.loads(conteudo)
            if job.get('status') not in {'concluido', 'erro', 'cancelado'}:
                raise ValueError('Execução de elegibilidade não está encerrada: ' + relativo)
            resultado = job.get('resultado') or {}
            if resultado.get('arquivo'):
                jobs.setdefault(resultado['arquivo'], []).append(resultado)
                arquivos_jobs[job['id']] = resultado['arquivo']
            sufixo = PurePosixPath(relativo).parts[2:]
            mapa[relativo] = JOBS + '/' + '/'.join(sufixo)
    for relativo, auditoria in elegiveis.items():
        fonte = auditoria.get('entrada', {}).get('id', '')
        caminho_fonte = fonte.removeprefix('storage:').split('::', 1)[0]
        normalizacao = normalizacoes.get(caminho_fonte)
        if normalizacao is None and caminho_fonte.endswith('.gpkg'):
            normalizacao = metadados_gpkg(caminho_fisico(root, caminho_fonte), 'SICARD_NORMALIZACAO')
        codigo = codigo_normalizacao(normalizacao or auditoria, codigos)
        resultados = jobs.get(relativo, [])
        # Um mesmo arquivo pode ter sido reaberto por outros usuários; preferir o processamento.
        resultados = sorted(resultados, key=lambda r: bool(r.get('registrado_em')))
        lote = next((r['lote_id'] for r in resultados if r.get('lote_id')), relativo)
        pasta = pasta_analise('elegibilidade-territorial', 'elegibilidade-territorial',
                             str(uuid5(NAMESPACE_URL, 'sicard:elegibilidade:' + lote)),
                             hierarquizacao=codigo, fase='fase-1' if codigo else None, conn=conn)
        mapa[relativo] = pasta + '/' + PurePosixPath(relativo).name
    por_hash = defaultdict(list)
    for relativo in elegiveis:
        por_hash[assinatura(originais[relativo])].append(relativo)
    for relativo, conteudo in originais.items():
        partes = PurePosixPath(relativo).parts
        if relativo in mapa:
            continue
        if relativo.endswith('.gpkg.nomes.json') or partes[1] == 'elegibilidade-revisoes':
            revisao = json.loads(conteudo)
            candidatos = por_hash.get(revisao.get('sha256'), [])
            arquivo = relativo.removesuffix('.nomes.json')
            if arquivo not in candidatos:
                hash_nome = PurePosixPath(relativo).stem
                candidatos_pessoais = [a for a in candidatos if assinatura(a.encode()) == hash_nome]
                if len(candidatos_pessoais) != 1:
                    raise ValueError('Revisão sem saída identificável: ' + relativo)
                arquivo = candidatos_pessoais[0]
            dono = assinatura(str(revisao['dono']).encode())
            novo = mapa[arquivo]
            mapa[relativo] = str(PurePosixPath(novo).parent) + '/revisoes/' + dono + '/' + assinatura(novo.encode()) + '.json'
        elif partes[1] == 'relatorios-elegibilidade' and relativo.endswith('.zip'):
            with zipfile.ZipFile(caminho_fisico(root, relativo)) as pacote:
                candidatos = set()
                vinculados = set()
                for item in pacote.namelist():
                    if item.lower().endswith('.gpkg'):
                        candidatos.update(por_hash.get(assinatura(pacote.read(item)), []))
                    elif item.lower().endswith('.json'):
                        documento = json.loads(pacote.read(item))
                        vinculados.update(arquivos_jobs[e['id']] for e in documento.get('entradas', [])
                                           if e.get('id') in arquivos_jobs)
                if vinculados:
                    if not vinculados <= candidatos:
                        raise ValueError('O vínculo do pacote diverge dos GeoPackages incluídos: ' + relativo)
                    candidatos = vinculados
            pastas_relatorio = {str(PurePosixPath(mapa[a]).parent) for a in candidatos}
            if len(pastas_relatorio) != 1:
                raise ValueError('Pacote sem análise única comprovada: ' + relativo)
            pasta = pastas_relatorio.pop()
            mapa[relativo] = pasta + '/' + PurePosixPath(relativo).stem + '_' + partes[2] + '.zip'
        else:
            raise ValueError('Arquivo não classificado: ' + relativo)
    if len(set(mapa.values())) != len(mapa):
        raise ValueError('Dois arquivos receberiam o mesmo destino; nada foi alterado.')
    preferidas = {}
    for origem, destino in mapa.items():
        alvo = caminho_fisico(root, destino)
        if alvo.exists():
            if origem.startswith('saidas-geoespaciais/elegibilidade-execucoes/'):
                preferidas[origem] = escolher_historico(originais[origem], alvo.read_bytes())
                originais[destino] = preferidas[origem]
            else:
                raise FileExistsError('Destino já existe: ' + destino)
    return mapa, originais, preferidas


def transformar_jsons(originais: dict[str, bytes], mapa: dict[str, str],
                      preferidas: dict[str, bytes] | None = None, *, ids=None, preservar=(),
                      preservar_urls=False):
    preferidas = preferidas or {}
    preservar = set(preservar)
    if preservar & (set(mapa) | set(mapa.values()) | set(preferidas)):
        raise ValueError('Arquivo preservado não pode participar de renomeação ou consolidação.')
    documentos = {}
    for p, data in originais.items():
        if p.endswith('.json') and p not in preservar:
            documentos[p] = json.loads(preferidas.get(p, data))
    resultado = {p: preferidas.get(p, data) for p, data in originais.items()}
    for _ in range(len(documentos) + 2):
        hashes = defaultdict(set)
        for p, data in resultado.items():
            if data != originais[p]:
                hashes[assinatura(originais[p])].add(assinatura(data))
        ambiguos = {h for h, novos in hashes.items() if len(novos) > 1}
        if ambiguos:
            raise ValueError('Hashes de JSON duplicados exigem resolução por contexto.')
        remapear = Remapeamento(mapa, {h: next(iter(novos)) for h, novos in hashes.items()},
                                {p: len(data) for p, data in resultado.items()}, ids=ids,
                                preservar_urls=preservar_urls)
        novos = dict(resultado)
        for p, documento in documentos.items():
            revisao = isinstance(documento, dict) and {'nomes', 'dono', 'sha256'} <= documento.keys()
            atualizado = remapear.valor(documento, revisao=revisao)
            novos[p] = (json.dumps(atualizado, ensure_ascii=False, indent=2, allow_nan=False).encode()
                         if atualizado != documento else preferidas.get(p, originais[p]))
        for p, data in originais.items():
            if not p.lower().endswith('.zip') or p in preservar:
                continue
            fonte = preferidas.get(p, data)
            buffer = BytesIO()
            mudou = False
            with zipfile.ZipFile(BytesIO(fonte)) as entrada, zipfile.ZipFile(buffer, 'w') as saida:
                for info in entrada.infolist():
                    conteudo = entrada.read(info)
                    if info.filename.lower().endswith('.json'):
                        documento = json.loads(conteudo)
                        novo = remapear.valor(documento)
                        if novo != documento:
                            conteudo = json.dumps(novo, ensure_ascii=False, allow_nan=False).encode()
                            mudou = True
                    saida.writestr(info, conteudo)
            novos[p] = buffer.getvalue() if mudou else fonte
        if novos == resultado:
            return resultado, remapear
        resultado = novos
    raise ValueError('Dependência circular de checksums nos JSONs; nenhuma origem removida.')


def colunas_operacionais(conn):
    from api.services.catalogo_referencias_storage import colunas_operacionais as descobrir
    return descobrir(conn)


def adaptar(valor, tipo):
    from api.services.catalogo_referencias_storage import adaptar as converter
    return converter(valor, tipo)


def alteracoes_banco(conn, remapear: Remapeamento, arquivos, mapa):
    tabelas, chaves = colunas_operacionais(conn)
    alteracoes = []
    for tabela, colunas in tabelas.items():
        pks = chaves.get(tabela)
        textos = [c for c, tipo in colunas.items() if tipo in {'json','jsonb','text','character varying'}]
        if not textos:
            continue
        filtro = sql.SQL(' OR ').join(sql.SQL('{}::text LIKE %s').format(sql.Identifier(c)) for c in textos)
        selecao = list(dict.fromkeys([*(pks or []), *colunas]))
        consulta = sql.SQL('SELECT {} FROM {} WHERE ({}) FOR UPDATE').format(
            sql.SQL(',').join(map(sql.Identifier, selecao)), sql.Identifier(*tabela), filtro)
        linhas = conn.execute(consulta, ['%saidas-geoespaciais%'] * len(textos)).fetchall()
        if linhas and not pks:
            raise ValueError('Tabela com referências mas sem chave primária: ' + '.'.join(tabela))
        for anterior in linhas:
            novo = {c: remapear.valor(v) for c, v in anterior.items()}
            if tabela == ('geoprocessamento','arquivo_resultado') and anterior['caminho'] in arquivos:
                data = arquivos[anterior['caminho']]
                novo['sha256'], novo['tamanho_bytes'] = assinatura(data), len(data)
            alteradas = [c for c in colunas if novo[c] != anterior[c]]
            if alteradas:
                alteracoes.append({'tabela': tabela, 'chaves': {p: anterior[p] for p in pks},
                                    'antes': {c: anterior[c] for c in alteradas},
                                    'depois': {c: novo[c] for c in alteradas},
                                    'tipos': {c: colunas[c] for c in alteradas}})
    return alteracoes


def gravar(root: Path, relativo: str, dados: bytes, *, mtime_ns=None, exclusivo=False):
    destino = caminho_fisico(root, relativo)
    criadas = []
    pai = destino.parent
    while not pai.exists():
        criadas.append(pai)
        pai = pai.parent
    destino.parent.mkdir(parents=True, exist_ok=True)
    for pai in dict.fromkeys([*criadas, destino.parent]):
        os.chown(pai, -1, 1000)
        os.chmod(pai, 0o2770)
    tmp = destino.with_name('.migracao-' + uuid4().hex + '.tmp')
    try:
        with tmp.open('xb') as stream:
            stream.write(dados)
            stream.flush()
            os.fsync(stream.fileno())
        if exclusivo:
            os.link(tmp, destino)
        else:
            publicar_arquivo(tmp, destino)
        if mtime_ns is not None:
            os.utime(destino, ns=(mtime_ns, mtime_ns))
    finally:
        tmp.unlink(missing_ok=True)


def conferir_api(arquivos: dict[str, bytes]):
    if not arquivos:
        return
    original = storage_remoto._cliente
    with original() as cliente:
        @contextmanager
        def compartilhado():
            yield cliente
        storage_remoto._cliente = compartilhado
        try:
            # Inicializa o token antes das leituras paralelas.
            primeira = next(iter(arquivos))
            if assinatura(storage_remoto.baixar(primeira)) != assinatura(arquivos[primeira]):
                raise ValueError('A API retornou conteúdo divergente: ' + primeira)
            def conferir(item):
                path, data = item
                if assinatura(storage_remoto.baixar(path)) != assinatura(data):
                    raise ValueError('A API retornou conteúdo divergente: ' + path)
            with ThreadPoolExecutor(max_workers=4) as executor:
                list(executor.map(conferir, arquivos.items()))
        finally:
            storage_remoto._cliente = original


def executar(aplicar=False, *, planejador=None, consolidar=None):
    cfg = get_settings()
    root = raiz_escrita()
    with psycopg.connect(cfg.slt_database_url, row_factory=dict_row, connect_timeout=5,
                         options='-c statement_timeout=30000 -c lock_timeout=5000') as conn:
        conn.execute("SELECT pg_advisory_xact_lock(hashtext('sicard:migrar-destinos-storage'))")
        plano = (planejador or destinos)(root, conn)
        mapa, originais, preferidas = plano
        mapa_referencias = getattr(plano, 'mapa_referencias', mapa)
        reconciliacao = getattr(plano, 'reconciliacao_codificacao', None)
        pendencias = getattr(plano, 'pendencias_preexistentes', [])
        inventario_preservados = getattr(plano, 'arquivos_sem_vinculo_preservados', [])
        caminhos_preservados = {p['caminho'] for p in inventario_preservados}
        preservados = {(p['tabela'], p['registro_id']) for p in pendencias
                       if p['tabela'] in {'arquivo_exportado', 'arquivo_resultado'}}
        def preservar_orfaos(alteracoes):
            return [a for a in alteracoes if not (
                a['tabela'][0] == 'geoprocessamento'
                and (a['tabela'][1], str(a['chaves'].get('id'))) in preservados)]
        if not mapa and not mapa_referencias and not pendencias and not inventario_preservados:
            print('Nenhuma origem legada pendente.')
            if not aplicar:
                conn.rollback()
            return
        for p in sorted((root / CONFIG).rglob('*.json')):
            relativo = p.relative_to(root).as_posix()
            if '/migracoes-storage/' not in relativo:
                originais[relativo] = p.read_bytes()
        if planejador:
            bloqueados = set(originais) | set(mapa.values())
            chaves = {'edicao-storage:' + p.casefold() for p in bloqueados}
            chaves.update('saida-storage:' + str(PurePosixPath(p).parent).casefold() for p in bloqueados)
            for chave in sorted(chaves):
                registro = conn.execute(
                    'SELECT pg_try_advisory_lock(hashtextextended(%s,0)) AS adquirido',
                    (chave,)).fetchone()
                if not registro or not registro['adquirido']:
                    raise ValueError('Há um produtor ativo no acervo; suspenda-o antes da migração.')
            for p, data in originais.items():
                if caminho_fisico(root, p).read_bytes() != data:
                    raise ValueError('O acervo mudou durante o planejamento: ' + p)
        ids, exclusoes = consolidar(conn, mapa) if consolidar else ({}, [])
        arquivos, remapear = transformar_jsons(originais, mapa_referencias, preferidas, ids=ids,
                                              preservar=caminhos_preservados,
                                              preservar_urls=reconciliacao is not None)
        existentes = {mapa[p] for p in preferidas if p in mapa and mapa[p] in originais}
        if any(arquivos[p] != arquivos[mapa[p]] for p in preferidas
               if p in mapa and mapa[p] in originais):
            raise ValueError('O histórico vigente e o legado não convergiram para o mesmo resultado.')
        alteracoes = preservar_orfaos(alteracoes_banco(conn, remapear, arquivos, mapa_referencias))
        excluidos = {str(r['id']) for r in exclusoes}
        alteracoes = [item for item in alteracoes if not (
            item['tabela'] == ('geoprocessamento', 'arquivo_exportado')
            and str(item['chaves'].get('id')) in excluidos)]
        configuracoes = {p: data for p, data in arquivos.items() if p not in mapa and data != originais[p]}
        print(json.dumps({'arquivos_a_mover': len(mapa), 'configuracoes_a_atualizar': len(configuracoes),
                          'registros_a_atualizar': len(alteracoes),
                          'exportacoes_consolidadas': len(exclusoes),
                          'pendencias_preexistentes': pendencias,
                          'arquivos_sem_vinculo_preservados': inventario_preservados,
                          'reconciliacao_codificacao': reconciliacao,
                          'destinos': dict((k, sum('/'+k+'/' in p for p in mapa.values()))
                                           for k in ('hierarquizacoes','analises-avulsas','exportacoes'))},
                         ensure_ascii=False))
        if not aplicar:
            conn.rollback()
            return
        ident = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid4().hex[:8]
        pasta = CONFIG + '/migracoes-storage/' + ident
        manifesto = {'id': ident, 'estado': 'preparando', 'mapa': mapa, 'banco': alteracoes,
                      'pendencias_preexistentes': pendencias,
                      'arquivos_sem_vinculo_preservados': inventario_preservados,
                      'reconciliacao_codificacao': reconciliacao,
                      'mapa_referencias': mapa_referencias,
                      'exportacoes_consolidadas': exclusoes, 'aliases_exportacoes': ids,
                      'arquivos': {p: {'sha256_antes': assinatura(originais[p]), 'sha256_depois': assinatura(data)}
                                   for p, data in arquivos.items() if p in mapa or p in configuracoes or p in existentes}}
        def registrar(estado):
            manifesto['estado'] = estado
            gravar(root, pasta + '/manifesto.json',
                   json.dumps(manifesto, ensure_ascii=False, indent=2, default=str).encode())
        registrar('preparando')
        backups = {}
        for indice, (p, data) in enumerate(arquivos.items()):
            if data != originais[p] or p in configuracoes:
                backup = pasta + '/backups/' + str(indice) + '.json'
                gravar(root, backup, originais[p])
                backups[p] = backup
        manifesto['backups'] = backups
        registrar('copiando')
        copiados = set()
        for origem, destino in mapa.items():
            fonte = caminho_fisico(root, origem)
            if assinatura(fonte.read_bytes()) != assinatura(originais[origem]):
                raise ValueError('A origem mudou durante o planejamento: ' + origem)
            if destino not in existentes and destino not in copiados:
                gravar(root, destino, arquivos[origem], mtime_ns=fonte.stat().st_mtime_ns, exclusivo=True)
                copiados.add(destino)
        conferidos = {destino: arquivos[origem] for origem, destino in mapa.items() if destino not in existentes}
        conferir_api(conferidos)
        registrar('copias_conferidas_pela_api')
        aplicadas = []
        try:
            for p, data in configuracoes.items():
                if caminho_fisico(root, p).read_bytes() != originais[p]:
                    raise ValueError('A configuração mudou durante o planejamento: ' + p)
                gravar(root, p, data)
                aplicadas.append(p)
            if configuracoes:
                conferir_api(configuracoes)
            for registro in exclusoes:
                removido = conn.execute('DELETE FROM geoprocessamento.arquivo_exportado WHERE id=%s',
                                       (registro['id'],))
                if removido.rowcount != 1:
                    raise ValueError('A consolidação não atingiu exatamente uma exportação.')
            for item in alteracoes:
                cols = list(item['depois'])
                query = sql.SQL('UPDATE {} SET {} WHERE {}').format(
                    sql.Identifier(*item['tabela']),
                    sql.SQL(',').join(sql.SQL('{}=%s').format(sql.Identifier(c)) for c in cols),
                    sql.SQL(' AND ').join(sql.SQL('{}=%s').format(sql.Identifier(c)) for c in item['chaves']))
                valores = [adaptar(item['depois'][c], item['tipos'][c]) for c in cols]
                resultado = conn.execute(query, valores + list(item['chaves'].values()))
                if resultado.rowcount != 1:
                    raise ValueError('Atualização não atingiu exatamente uma chave primária.')
            if preservar_orfaos(alteracoes_banco(conn, remapear, arquivos, mapa_referencias)):
                raise ValueError('Ainda há referências operacionais que exigem remapeamento.')
            for p in caminhos_preservados:
                if caminho_fisico(root, p).read_bytes() != originais[p]:
                    raise ValueError('Arquivo preservado mudou durante a migração: ' + p)
            conn.commit()
        except Exception:
            conn.rollback()
            LOG.exception('Migração interrompida; origens preservadas. Restaurando configurações.')
            for p in aplicadas:
                if caminho_fisico(root, p).read_bytes() != configuracoes[p]:
                    raise RuntimeError('Configuração concorrente não será sobrescrita: ' + p)
                gravar(root, p, originais[p])
            registrar('interrompida_antes_do_commit')
            raise
        registrar('vinculos_confirmados')
        pastas = set()
        for origem, destino in mapa.items():
            fonte, alvo = caminho_fisico(root, origem), caminho_fisico(root, destino)
            if fonte.read_bytes() != originais[origem] or alvo.read_bytes() != arquivos[origem]:
                raise ValueError('Conferência final falhou; origem não excluída: ' + origem)
            for pai in fonte.parents:
                if pai == root / 'saidas-geoespaciais':
                    break
                if not pai.is_relative_to(root / 'saidas-geoespaciais'):
                    break
                pastas.add(pai)
            fonte.unlink()
        removidas = []
        for p in sorted(pastas, key=lambda p: len(p.parts), reverse=True):
            if p.exists() and next(p.iterdir(), None) is None:
                p.rmdir()
                removidas.append(p.relative_to(root).as_posix())
        manifesto['pastas_removidas'] = removidas
        registrar('concluida')
        print(json.dumps({'estado': 'concluida', 'arquivos_movidos': len(mapa),
                          'leituras_api_validadas': len(conferidos) + len(configuracoes),
                          'registros_atualizados': len(alteracoes), 'pastas_vazias_removidas': len(removidas),
                          'pendencias_preexistentes': len(pendencias),
                          'arquivos_sem_vinculo_preservados': len(inventario_preservados),
                          'manifesto': pasta + '/manifesto.json'}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--aplicar', action='store_true', help='Copia, confere, atualiza vínculos e remove somente origens conferidas.')
    executar(parser.parse_args().aplicar)
