"""Planeja nomes por vínculos do catálogo; aplicação exige montagem e manutenção."""
from __future__ import annotations

import argparse
from collections import defaultdict
from contextlib import closing
from datetime import datetime, timezone
from io import BytesIO
import json
from pathlib import Path, PurePosixPath
import re
import sqlite3
import sys
from uuid import NAMESPACE_URL, UUID, uuid5
from zipfile import ZipFile

from scripts import migrar_destinos_storage as base
from api.services.ciclo_vida_arquivos import apelido


class Plano(tuple):
    """Preserva a API de três mapas e anexa o inventário de ausências anteriores."""

    def __new__(cls, mapa, originais, preferidas, pendencias, preservados=()):
        plano = super().__new__(cls, (mapa, originais, preferidas))
        plano.pendencias_preexistentes = pendencias
        plano.arquivos_sem_vinculo_preservados = list(preservados)
        return plano


def nome_legivel_sem_vinculo(caminho):
    """Reconhece nomes descritivos já organizados, sem atribuir identidade."""
    from api.services.pastas_storage import nome_valido
    partes = PurePosixPath(caminho).parts
    if len(partes) < 2 or partes[0] != 'saidas-geoespaciais':
        return False
    minimo = {'analises-avulsas': 5, 'hierarquizacoes': 6, 'exportacoes': 4}
    if len(partes) < minimo.get(partes[1], 1000):
        return False
    for parte in partes[2:]:
        try:
            nome_valido(parte)
        except ValueError:
            return False
        if re.search(r'[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}', parte, re.I):
            return False
        for token in re.split(r'[_ .-]+', parte):
            if re.fullmatch(r'[a-f0-9]{8,}', token, re.I) and (
                    len(token) >= 12 or re.search(r'[a-f]', token, re.I)):
                return False
    return any(letra.isalpha() for letra in PurePosixPath(caminho).stem)


def titulo_gpkg(root, caminho):
    """Usa apenas título interno unívoco, nunca o nome físico legado."""
    path = base.caminho_fisico(root, caminho)
    try:
        with closing(sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True)) as db:
            nomes = db.execute(
                "SELECT identifier FROM gpkg_contents WHERE data_type='features'").fetchall()
    except sqlite3.DatabaseError:
        return None
    if len(nomes) != 1 or not nomes[0][0]:
        return None
    nome = nomes[0][0]
    if re.fullmatch(r'[a-f0-9-]{32,36}', nome, re.I):
        return None
    if base.metadados_gpkg(path, 'SICARD_NORMALIZACAO'):
        # Este papel é definido pelo produtor em elegibilidade_preparacao.
        return 'demandas_normalizadas'
    return nome


def titulo_pacote_municipal(registro, registros, originais, conn):
    """Confronta manifesto interno e catálogo/relatório do mesmo recurso.

    O produtor municipal grava o nome humano na camada, não no manifesto.
    O basename aleatório serve apenas para relacionar membros, nunca como título.
    """
    recurso = registro['recurso_origem']
    if not recurso:
        return None
    with ZipFile(BytesIO(originais[registro['caminho']])) as pacote:
        membros = pacote.namelist()
        if (len(membros) != len(set(membros)) or any(
                PurePosixPath(p).name != p or '\\' in p for p in membros)):
            raise ValueError('Pacote municipal com membros ambíguos ou inválidos: ' + registro['caminho'])
        metadados = [p for p in membros if p.endswith('_metadados.json')]
        if len(metadados) != 1:
            raise ValueError('Manifesto municipal não unívoco: ' + registro['caminho'])
        manifesto = json.loads(pacote.read(metadados[0]))
        if not isinstance(manifesto, dict):
            raise ValueError('Manifesto municipal inválido: ' + registro['caminho'])
        base_arquivos = metadados[0].removesuffix('_metadados.json')
        formato = manifesto.get('format')
        if not isinstance(formato, str) or base_arquivos + '.' + formato not in membros:
            raise ValueError('Camada do manifesto ausente do pacote: ' + registro['caminho'])
    nomes = set()
    comprovado = False
    camadas = conn.execute('''
        SELECT nome,metadados FROM geoprocessamento.camada_processada WHERE recurso_sessao_id=%s
        UNION ALL
        SELECT nome,metadados FROM geoprocessamento.camada_importada WHERE recurso_sessao_id=%s
    ''', (recurso, recurso)).fetchall()
    if len(camadas) != 1:
        return None
    for camada in camadas:
        metadata = camada.get('metadados') or {}
        if metadata.get('execucao_id') and str(metadata['execucao_id']) != str(registro['execucao_id']):
            raise ValueError('Execução do pacote diverge da camada municipal: ' + registro['caminho'])
        if metadata.get('base_arquivos') and metadata['base_arquivos'] != base_arquivos:
            raise ValueError('Base do pacote diverge da camada municipal: ' + registro['caminho'])
        if metadata.get('manifesto') is not None:
            if metadata['manifesto'] != manifesto:
                raise ValueError('Manifesto do pacote diverge do catálogo municipal: ' + registro['caminho'])
            comprovado = True
        if camada.get('nome'):
            nomes.add(camada['nome'])
    for companheiro in registros:
        if (companheiro['execucao_id'] != registro['execucao_id']
                or companheiro['recurso_origem'] != recurso
                or (companheiro['validacao'] or {}).get('tipo') != 'metadados_municipais'
                or companheiro['caminho'] not in originais):
            continue
        if json.loads(originais[companheiro['caminho']]) != manifesto:
            raise ValueError('Manifesto do pacote diverge do relatório municipal: ' + registro['caminho'])
        comprovado = True
    if not comprovado or len(nomes) != 1:
        return None
    nome = nomes.pop()
    if not isinstance(nome, str) or re.fullmatch(r'(?:camada_)?[a-f0-9-]{32,36}', nome, re.I):
        return None
    return 'Pacote ' + nome


def planejar(root: Path, conn):
    """Ausências integrais são inventariadas; identidade de arquivos presentes é obrigatória.

    Não recupera, substitui nem exclui órfãos. Um conjunto parcialmente presente
    exige recuperação antes de migrar, assim como um arquivo sem identidade.
    Produtos já legíveis sem vínculo são inventariados e mantidos integralmente
    no local original; a preservação não cria identidade nem registro de catálogo.
    """
    registros = conn.execute('''
        SELECT a.id AS registro_id,a.caminho,a.componentes,a.validacao,a.recurso_origem,a.execucao_id,
               e.parametros,e.iniciado_em,e.operacao
          FROM geoprocessamento.arquivo_exportado a
          JOIN geoprocessamento.execucao_arquivo e ON e.id=a.execucao_id
         ORDER BY e.iniciado_em,a.id
    ''').fetchall()
    resultados = conn.execute('''
        SELECT a.id AS registro_id,a.caminho,a.camada_id,a.execucao_id,a.sha256,a.tamanho_bytes,c.nome,c.recurso_sessao_id,e.parametros,
               e.iniciado_em,e.operacao
          FROM geoprocessamento.arquivo_resultado a
          JOIN geoprocessamento.camada_processada c ON c.id=a.camada_id
          JOIN geoprocessamento.execucao_arquivo e ON e.id=a.execucao_id
         WHERE a.estado <> 'removido'
         ORDER BY e.iniciado_em,a.id
    ''').fetchall()
    registros = [{**r, 'tabela_origem': 'arquivo_exportado'} for r in registros]
    registros.extend({**r, 'tabela_origem': 'arquivo_resultado',
                      'componentes': [{'caminho': r['caminho'], 'sha256': r['sha256'],
                                          'tamanho_bytes': r['tamanho_bytes']}],
                      'validacao': {'nome': apelido(r['nome'])},
                      'recurso_origem': 'camada:' + str(r['camada_id'])} for r in resultados)
    extracoes = conn.execute('''
        SELECT x.execucao_id AS registro_id,x.execucao_id,x.pacote_caminho,x.relatorio_caminho,x.pacote_nome,
               e.parametros,e.iniciado_em,e.operacao
          FROM geoprocessamento.extracao_atributos x
          JOIN geoprocessamento.execucao_arquivo e ON e.id=x.execucao_id
    ''').fetchall()
    for r in extracoes:
        for campo, titulo in [('pacote_caminho', PurePosixPath(r['pacote_nome'] or '').stem),
                               ('relatorio_caminho', 'resultado')]:
            if not r[campo]:
                continue
            registros.append({**r, 'tabela_origem': 'extracao_atributos', 'campo': campo,
                              'caminho': r[campo], 'componentes': [{'caminho': r[campo]}],
                              'validacao': {'nome': titulo},
                              'recurso_origem': 'extracao:' + str(r['execucao_id']) + ':' + campo})
    arquivos = sorted((root / 'saidas-geoespaciais').rglob('*'))
    originais = {}
    for p in arquivos:
        if p.is_symlink():
            raise ValueError('Link simbólico no acervo: ' + str(p))
        if p.is_file():
            relativo = p.relative_to(root).as_posix()
            base.caminho_fisico(root, relativo)
            originais[relativo] = p.read_bytes()
    evidencias = {}
    pastas = {}
    pendencias = []
    preservados = []
    for r in registros:
        caminho = r['caminho']
        caminhos_catalogados = {caminho, *(c['caminho'] for c in r['componentes'])}
        for catalogado in caminhos_catalogados:
            base.caminho_fisico(root, catalogado)
        if caminho not in originais:
            if caminhos_catalogados & originais.keys():
                raise ValueError('Recupere o principal ausente do conjunto parcialmente presente: ' + caminho)
            pendencias.append({
                'tipo': 'referencia_ausente_preexistente', 'tabela': r['tabela_origem'],
                'registro_id': str(r.get('registro_id') or ''),
                'execucao_id': str(r['execucao_id']), 'campo': r.get('campo', 'caminho'),
                'caminho': caminho, 'caminhos_ausentes': sorted(caminhos_catalogados),
                'acao': 'preservado_sem_alteracao; recuperar_da_fonte_ou_backup',
            })
            continue
        validacao = r['validacao'] or {}
        titulo = validacao.get('nome')
        if not titulo and validacao.get('tipo') in {'relatorio_execucao', 'metadados_municipais'}:
            titulo = validacao['tipo']
        if not titulo and validacao.get('pacote_municipal'):
            titulo = r['parametros'].get('nome_saida') or r['parametros'].get('nome')
            titulo = ('Pacote ' + titulo if titulo else
                      titulo_pacote_municipal(r, registros, originais, conn))
        if not titulo and PurePosixPath(caminho).suffix.lower() == '.gpkg':
            titulo = titulo_gpkg(root, caminho)
        recurso = r['recurso_origem']
        if not titulo or not recurso or not r['iniciado_em']:
            raise ValueError('Nome, identidade ou data não verificáveis: ' + caminho)
        parent = str(PurePosixPath(caminho).parent)
        partes = PurePosixPath(parent).parts
        if len(partes) >= 5 and partes[1] == 'hierarquizacoes':
            escopo = '/'.join(partes[:4])
        elif len(partes) >= 4 and partes[1] == 'analises-avulsas':
            escopo = '/'.join(partes[:3])
        elif len(partes) >= 3 and partes[1] == 'exportacoes':
            escopo = '/'.join(partes[:2])
        elif len(partes) == 4 and partes[1] == 'execucoes':
            UUID(partes[2])
            operacao = r['operacao']
            ferramenta = operacao.rstrip('/').removesuffix('/executar').rsplit('/', 1)[-1]
            ferramenta = {'gerar_camada_municipal': 'gerador-camadas-territoriais',
                          'extracao_atributos': 'extracao-atributos'}.get(ferramenta, ferramenta)
            escopo = ('saidas-geoespaciais/exportacoes' if operacao == 'exportacao_direta' else
                      'saidas-geoespaciais/analises-avulsas/' + apelido(ferramenta, 60).replace('_', '-'))
        else:
            raise ValueError('Organize primeiro o destino legado: ' + caminho)
        # A identidade da análise vem do registro, não do título da pasta.
        legado = re.search(r'_([a-f0-9]{32})$', partes[-1])
        identidade = str(UUID(legado.group(1))) if legado else 'pasta:' + parent
        if not legado and partes[1] in {'hierarquizacoes', 'analises-avulsas', 'exportacoes'}:
            reserva = conn.execute(
                'SELECT identidade FROM geoprocessamento.nome_storage WHERE escopo=%s AND nome=%s',
                (escopo, partes[-1])).fetchone()
            if reserva:
                identidade = reserva['identidade']
        titulo_analise = re.sub(r'^\d{8}T\d{6}Z_', '', partes[-1])
        titulo_analise = re.sub(r'_[a-f0-9]{32}$', '', titulo_analise)
        if partes[1] == 'execucoes':
            identidade = str(UUID(partes[2]))
            titulo_analise = apelido(r['parametros'].get('nome_saida') or r['parametros'].get('nome')
                                    or ferramenta, 60)
        if titulo == 'demandas_normalizadas' and PurePosixPath(caminho).suffix.lower() == '.gpkg':
            metadados = base.metadados_gpkg(base.caminho_fisico(root, caminho), 'SICARD_NORMALIZACAO')
            origem = metadados.get('origem', {})
            if origem.get('id') != recurso:
                raise ValueError('Origem da preparação diverge do catálogo: ' + caminho)
            if partes[1] == 'hierarquizacoes' and origem.get('hierarquizacao') != partes[2]:
                raise ValueError('Hierarquização da preparação divergente: ' + caminho)
            fase = partes[3] if partes[1] == 'hierarquizacoes' else None
            analise = ('favorabilidade' if fase == 'fase-2' or 'favorabilidade' in parent
                       else 'elegibilidade')
            identidade = str(uuid5(NAMESPACE_URL, f'sicard:preparacao:{analise}:{recurso}'))
        if not titulo_analise or re.fullmatch(r'[a-f0-9-]{32,36}', titulo_analise):
            raise ValueError('Análise sem nome verificável: ' + parent)
        pasta = (escopo, identidade, titulo_analise)
        if parent in pastas and pastas[parent] != pasta:
            raise ValueError('Identidades divergentes para a pasta: ' + parent)
        pastas[parent] = pasta
        from api.services.pastas_storage import nome_valido
        nome = nome_valido(titulo)
        if not nome:
            raise ValueError('Elemento sem nome verificável: ' + caminho)
        componentes = r['componentes']
        for componente in componentes:
            caminho_componente = componente['caminho']
            if caminho_componente not in originais:
                raise ValueError('Componente ausente; recupere o conjunto antes de migrar: ' + caminho_componente)
            dados = originais[caminho_componente]
            if (componente.get('sha256') and base.assinatura(dados) != componente['sha256']
                    or componente.get('tamanho_bytes') is not None
                    and len(dados) != componente['tamanho_bytes']):
                raise ValueError('Integridade do componente diverge do catálogo: ' + caminho_componente)
        caminhos = [c['caminho'] for c in componentes]
        if caminho not in caminhos:
            raise ValueError('Componente principal ausente: ' + caminho)
        for componente in caminhos:
            if componente not in originais or str(PurePosixPath(componente).parent) != parent:
                raise ValueError('Componente ausente ou fora da análise: ' + componente)
            sufixo = PurePosixPath(componente).name[len(PurePosixPath(caminho).stem):]
            if not sufixo.startswith('.'):
                raise ValueError('Base dos componentes divergente: ' + componente)
            extensao = PurePosixPath(caminho).suffix.lower()
            tipo = ('vetor' if extensao in {'.gpkg', '.shp', '.geojson', '.fgb', '.kml'}
                    else 'relatorio' if extensao == '.json' else 'raster')
            chave = ([str(r['execucao_id']), 'camadas', str(r.get('recurso_sessao_id') or r['camada_id'])]
                     if r.get('camada_id') else [recurso, tipo, nome])
            existente = conn.execute(
                'SELECT identidade FROM geoprocessamento.nome_storage WHERE escopo=%s AND nome=%s',
                (parent, PurePosixPath(caminho).name)).fetchone()
            if existente:
                chave = existente['identidade']
            evidencia = (parent, json.dumps([recurso, tipo, nome, PurePosixPath(caminho).suffix, chave]),
                         nome + sufixo, r['iniciado_em'])
            if componente in evidencias and evidencias[componente][:3] != evidencia[:3]:
                raise ValueError('Identidade conflitante no catálogo: ' + componente)
            evidencias[componente] = evidencia
    destinos_pastas = {}
    for parent, (escopo, identidade, titulo) in sorted(pastas.items()):
        from api.services.nomes_storage import reservar
        destinos_pastas[parent] = escopo + '/' + reservar(escopo, identidade, titulo, conn=conn)
    for caminho in sorted(originais.keys() - evidencias.keys()):
        parent = str(PurePosixPath(caminho).parent)
        nome = PurePosixPath(caminho).name
        if nome_legivel_sem_vinculo(caminho):
            preservados.append({
                'caminho': caminho, 'sha256': base.assinatura(originais[caminho]),
                'tamanho_bytes': len(originais[caminho]),
                'motivo': 'nome_legivel_sem_vinculo_catalogado',
                'acao': 'preservado_integralmente_no_caminho_original; requer_catalogacao',
            })
            continue
        internos = [p for p in pastas if caminho.startswith(p + '/revisoes/')]
        if internos:
            analise = max(internos, key=len)
            restante = caminho[len(analise) + 1:]
            evidencias[caminho] = (analise, 'interno:' + restante, restante,
                                   datetime.fromtimestamp(base.caminho_fisico(root, caminho).stat().st_mtime,
                                                          timezone.utc))
            continue
        if parent not in pastas:
            raise ValueError('Arquivo sem vínculo verificável; plano bloqueado: ' + caminho)
        padrao = re.fullmatch(r'(.+?)(?:_[a-f0-9]{12,32})?\.(pdf|xlsx|zip)', nome, re.I)
        if (not padrao or re.fullmatch(r'[a-f0-9-]{8,}', padrao.group(1), re.I)
                or not any(letra.isalpha() for letra in padrao.group(1))):
            raise ValueError('Arquivo sem nome/identidade verificáveis; plano bloqueado: ' + caminho)
        # Documentos possuem papel único dentro da mesma análise comprovada.
        papel = padrao.group(1) + '.' + padrao.group(2).lower()
        evidencias[caminho] = (parent, 'documento:' + papel, papel,
                               datetime.fromtimestamp(base.caminho_fisico(root, caminho).stat().st_mtime,
                                                      timezone.utc))
    grupos = defaultdict(list)
    mapa = {}
    for caminho, (parent, identidade, nome, data) in sorted(evidencias.items()):
        from api.services.nomes_storage import reservar
        pasta = destinos_pastas[parent]
        if identidade.startswith('interno:'):
            destino = pasta + '/' + nome
            grupos[destino].append((data, caminho, identidade))
            if caminho != destino:
                mapa[caminho] = destino
            continue
        principal = PurePosixPath(nome)
        # Reserva a base inteira; componentes de um shapefile compartilham identidade.
        if identidade.startswith('documento:'):
            titulo = principal.stem
            reservado = PurePosixPath(reservar(pasta, identidade, nome, conn=conn)).stem
        else:
            recurso, tipo, titulo, extensao, chave = json.loads(identidade)
            chave = json.dumps(chave) if isinstance(chave, list) else chave
            reservado = PurePosixPath(reservar(pasta, chave, titulo + extensao, conn=conn)).stem
        destino = pasta + '/' + reservado + nome[len(titulo):]
        grupos[destino].append((data, caminho, identidade))
        if caminho != destino:
            mapa[caminho] = destino
    preferidas = {}
    for destino, candidatos in grupos.items():
        if len({identidade for _, _, identidade in candidatos}) != 1:
            raise ValueError('Colisão de elementos distintos: ' + destino)
        candidatos.sort()
        if len(candidatos) > 1 and candidatos[-1][0] == candidatos[-2][0]:
            empatados = [p for d, p, _ in candidatos if d == candidatos[-1][0]]
            if len({base.assinatura(originais[p]) for p in empatados}) > 1:
                raise ValueError('Versões com data empatada e conteúdo divergente: ' + destino)
        vigente = originais[candidatos[-1][1]]
        for _, caminho, _ in candidatos:
            preferidas[caminho] = vigente
        if destino in originais:
            preferidas[destino] = vigente
    ausentes = {p for item in pendencias for p in item['caminhos_ausentes']}
    if ausentes & set(mapa.values()):
        raise ValueError('Destino coincide com referência órfã; recupere ou audite antes de migrar: '
                         + ', '.join(sorted(ausentes & set(mapa.values()))))
    for item in pendencias:
        print(json.dumps({'pendencia_preexistente': item}, ensure_ascii=False), file=sys.stderr)
    if {p['caminho'] for p in preservados} & set(mapa.values()):
        raise ValueError('Destino coincide com arquivo sem vínculo preservado; plano bloqueado.')
    for item in preservados:
        print(json.dumps({'arquivo_sem_vinculo_preservado': item}, ensure_ascii=False), file=sys.stderr)
    return Plano(mapa, originais, preferidas, pendencias, preservados)


def consolidar_catalogo(conn, mapa):
    grupos = defaultdict(list)
    registros = conn.execute('''
        SELECT a.*,e.iniciado_em AS data_execucao
          FROM geoprocessamento.arquivo_exportado a
          JOIN geoprocessamento.execucao_arquivo e ON e.id=a.execucao_id
         FOR UPDATE OF a
    ''').fetchall()
    for r in registros:
        if r['caminho'] not in mapa and r['caminho'] not in mapa.values():
            continue
        grupos[mapa.get(r['caminho'], r['caminho'])].append(r)
    aliases, exclusoes = {}, []
    for registros in grupos.values():
        if len(registros) < 2:
            continue
        if len({r['recurso_origem'] for r in registros}) != 1:
            raise ValueError('Consolidação de catálogo com identidades divergentes.')
        vigente = max(registros, key=lambda r: (r['data_execucao'], r['criado_em'], str(r['id'])))
        for r in registros:
            if r['id'] == vigente['id']:
                continue
            aliases[str(r['id'])] = str(vigente['id'])
            exclusoes.append({k: v for k, v in r.items() if k != 'data_execucao'})
    return aliases, exclusoes


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--aplicar', action='store_true')
    parser.add_argument('--manutencao', action='store_true',
                        help='Confirma que produtores estão parados durante a aplicação.')
    args = parser.parse_args()
    if args.aplicar and not args.manutencao:
        parser.error('--aplicar exige --manutencao e suspensão dos produtores')
    base.executar(args.aplicar, planejador=planejar, consolidar=consolidar_catalogo)
