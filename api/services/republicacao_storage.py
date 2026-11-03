"""Publicação de bytes e referências operacionais numa unidade de trabalho."""
from contextlib import contextmanager, ExitStack
from contextvars import ContextVar
from hashlib import sha256
from io import BytesIO
import json
from pathlib import PurePosixPath

from psycopg import sql

from api.db.connection import atomic_connection
from api.services import storage_remoto
from api.services.catalogo_referencias_storage import colunas_operacionais, adaptar
from api.services.remapeamento_storage import atualizar_referencias, Remapeamento, metadados_arquivo

CONFIG = 'aplicacao/data/geoespacial/configuracoes'
CHAVE = 'sicard:publicacao-referencias-storage'
_atual = ContextVar('publicacao_storage', default=None)
_guardado = ContextVar('guardando_referencias_storage', default=False)


@contextmanager
def bloquear_referencias():
    if _guardado.get():
        yield
        return
    from api.services.saidas_storage import bloquear_arquivo
    with bloquear_arquivo(CHAVE):
        token = _guardado.set(True)
        try:
            yield
        finally:
            _guardado.reset(token)


def jsons_operacionais():
    def percorrer(pasta):
        try:
            itens = storage_remoto.listar(pasta, estrito=True)
        except FileNotFoundError:
            return
        for item in itens:
            nome = item['nome']
            from api.services.pastas_storage import nome_valido
            nome_valido(nome)
            path = pasta + '/' + nome
            if item['pasta']:
                if nome != 'migracoes-storage':
                    yield from percorrer(path)
            elif nome.lower().endswith('.json'):
                yield path
    yield from percorrer(CONFIG)
    # Revisões também são referências operacionais, não registros imutáveis.
    yield from percorrer('saidas-geoespaciais')


def protegido(valor):
    if not isinstance(valor, dict):
        return False
    return (valor.get('status') in {'homologada', 'publicada', 'hierarq_homologada', 'hierarq_publicada'}
            or bool(valor.get('homologado_em') or valor.get('publicado_em') or valor.get('homologado_por'))
            or valor.get('homologado') is True or valor.get('publicado') is True)


def referencia_alterada(valor, caminhos):
    texto = json.dumps(valor, default=str, ensure_ascii=False)
    return Remapeamento({p: 'referencia-protegida' for p in caminhos}).texto(texto) != texto


class Publicacao:
    def __init__(self, conn):
        self.conn = conn
        self.anteriores = {}
        self.arquivos = {}
        self.tocados = set()
        self.bloqueios = ExitStack()
        self.ao_confirmar = []

    def antes(self, path):
        if path in self.anteriores:
            return
        from api.services import saidas_storage
        self.bloqueios.enter_context(saidas_storage.bloquear_arquivo(path))
        anterior = saidas_storage._anterior(path)
        self.anteriores[path] = anterior
        if anterior is not None:
            linhas = self.conn.execute('''
                SELECT codigo,status,homologado_em,dados_hierarquizacao
                  FROM hierarquizacao_demandas.hierarquizacao_portfolio FOR SHARE
            ''').fetchall()
            for linha in linhas:
                prefixo = f"saidas-geoespaciais/hierarquizacoes/{linha['codigo']}/"
                texto = json.dumps(linha, default=str, ensure_ascii=False)
                referencia = Remapeamento({path: 'referencia-protegida'}).texto(texto) != texto
                if protegido(linha) and (path.startswith(prefixo) or referencia):
                    raise ValueError('Republicação bloqueada: saída vinculada a resultado homologado/publicado.')

    def atualizar(self):
        from api.services import saidas_storage
        alterados = {p: d for p, d in self.arquivos.items()
                     if self.anteriores[p] is not None and self.anteriores[p] != d}
        if not alterados:
            return
        metas = {p: {'sha256': sha256(d).hexdigest(), 'tamanho_bytes': len(d), **metadados_arquivo(p, d)}
                 for p, d in alterados.items()}
        documentos = {}
        for path in sorted(set(jsons_operacionais())):
            if path in self.arquivos or '/migracoes-storage/' in path:
                continue
            antes = storage_remoto.baixar(path)
            documento = json.loads(antes)
            documentos[path] = (antes, documento)
        # Referências encadeadas a JSONs têm seus próprios hashes atualizados.
        resultado = {}
        for _ in range(len(documentos) + 2):
            novos = {}
            for path, (antes, doc) in documentos.items():
                if protegido(doc) and referencia_alterada(doc, alterados):
                    raise ValueError('Republicação bloqueada: documento homologado/publicado.')
                contexto = None
                for alvo in alterados:
                    pasta = str(PurePosixPath(alvo).parent)
                    nome = sha256(alvo.encode()).hexdigest()
                    if (path == alvo + '.nomes.json' or
                            path.startswith(pasta + '/revisoes/') and
                            PurePosixPath(path).name in {nome + '.json', nome + '.demandas.json'}):
                        contexto = alvo
                        if path.endswith('.demandas.json') and doc.get('nomes'):
                            import pyogrio
                            layer = 'elegibilidade_territorial'
                            a = pyogrio.read_dataframe(BytesIO(self.anteriores[alvo]), layer=layer)
                            b = pyogrio.read_dataframe(BytesIO(alterados[alvo]), layer=layer)
                            if len(a) != len(b) or not a.geometry.to_wkb().equals(b.geometry.to_wkb()):
                                raise ValueError('Republicação bloqueada: revisão posicional de demandas exige validação.')
                        break
                if ('/favorabilidade-agregacao/' in path and isinstance(doc, dict)
                        and 'arquivos' not in doc and any('favorabilidade' in m for m in metas.values())):
                    raise ValueError('Republicação bloqueada: agregação legada sem referências verificáveis.')
                atualizado = atualizar_referencias(doc, metas, contexto)
                if atualizado == doc:
                    continue
                if protegido(doc) or (isinstance(doc, dict) and doc.get('status') == 'executando'):
                    raise ValueError('Republicação bloqueada: referência protegida ou execução ainda ativa.')
                dados = json.dumps(atualizado, ensure_ascii=False, allow_nan=False).encode()
                novos[path] = dados
                metas[path] = {'sha256': sha256(dados).hexdigest(), 'tamanho_bytes': len(dados)}
            if novos == resultado:
                break
            resultado = novos
        else:
            raise ValueError('Referências circulares de assinaturas; republicação cancelada.')
        tabelas, chaves = colunas_operacionais(self.conn)
        for tabela, colunas in tabelas.items():
            textos = [c for c, t in colunas.items() if t in {'json', 'jsonb', 'text', 'character varying'}]
            if not textos:
                continue
            filtro = sql.SQL(' OR ').join(
                sql.SQL('({}::text LIKE %s OR {}::text LIKE %s)').format(sql.Identifier(c), sql.Identifier(c))
                for c in textos)
            selecao = list(dict.fromkeys([*chaves.get(tabela, []), *colunas]))
            consulta = sql.SQL('SELECT {} FROM {} WHERE ({}) FOR UPDATE').format(
                sql.SQL(',').join(map(sql.Identifier, selecao)), sql.Identifier(*tabela), filtro)
            linhas = self.conn.execute(consulta, ['%saidas-geoespaciais%', '%' + CONFIG + '%'] * len(textos)).fetchall()
            for antes in linhas:
                if (protegido(antes) or 'homolog' in tabela[1]) and referencia_alterada(antes, alterados):
                    raise ValueError('Republicação bloqueada: referência de banco homologada/publicada.')
                estruturado = dict(antes)
                decodificados = set()
                for campo, tipo in colunas.items():
                    valor = antes[campo]
                    if tipo in {'text', 'character varying'} and isinstance(valor, str) and valor.lstrip().startswith(('{', '[')):
                        estruturado[campo] = json.loads(valor)
                        decodificados.add(campo)
                depois = atualizar_referencias(estruturado, metas)
                for campo in decodificados:
                    depois[campo] = (json.dumps(depois[campo], ensure_ascii=False, allow_nan=False)
                                     if depois[campo] != estruturado[campo] else antes[campo])
                campos = [c for c in colunas if depois[c] != antes[c]]
                if not campos:
                    continue
                if protegido(antes) or 'homologad' in tabela[1]:
                    raise ValueError('Republicação bloqueada: referência de banco homologada/publicada.')
                pks = chaves.get(tabela)
                if not pks:
                    raise ValueError('Referência operacional sem chave primária: ' + '.'.join(tabela))
                comando = sql.SQL('UPDATE {} SET {} WHERE {}').format(
                    sql.Identifier(*tabela),
                    sql.SQL(',').join(sql.SQL('{}=%s').format(sql.Identifier(c)) for c in campos),
                    sql.SQL(' AND ').join(sql.SQL('{}=%s').format(sql.Identifier(c)) for c in pks))
                cursor = self.conn.execute(comando,
                    [adaptar(depois[c], colunas[c]) for c in campos] + [antes[c] for c in pks])
                if cursor.rowcount != 1:
                    raise RuntimeError('A republicação não atualizou exatamente uma referência.')
        for path, dados in resultado.items():
            self.antes(path)
            if self.anteriores[path] != documentos[path][0]:
                raise ValueError('Uma configuração mudou durante a republicação.')
            self.tocados.add(path)
            storage_remoto.enviar_bytes(path, dados)
            if storage_remoto.baixar(path) != dados:
                raise ValueError('Referência persistida diverge da publicação conferida.')

    def restaurar(self):
        from api.services.saidas_storage import restaurar
        falhas = []
        for path, data in reversed(list(self.anteriores.items())):
            if path not in self.tocados:
                continue
            try:
                restaurar(path, data)
            except Exception as erro:
                falhas.append(erro)
        if falhas:
            raise RuntimeError('Falha ao restaurar a publicação; requer conciliação explícita.') from falhas[0]


@contextmanager
def publicacao(*, conexao=None):
    if _atual.get() is not None:
        if conexao is not None and _atual.get().conn is not conexao:
            raise RuntimeError('Republicação não pode misturar conexões transacionais.')
        yield _atual.get()
        return
    estado = None
    with bloquear_referencias():
        try:
            with atomic_connection(conexao) as conn:
                estado = Publicacao(conn)
                token = _atual.set(estado)
                try:
                    yield estado
                    estado.atualizar()
                finally:
                    _atual.reset(token)
        except Exception:
            if estado:
                estado.restaurar()
            raise
        finally:
            if estado:
                estado.bloqueios.close()
        for acao in estado.ao_confirmar:
            try:
                acao()
            except Exception as erro:
                raise RuntimeError('Publicação confirmada; falhou somente a limpeza temporária. Não houve rollback.') from erro


def antes_de_gravar(path, dados):
    estado = _atual.get()
    if estado is None:
        raise RuntimeError('Gravação de saída sem unidade de publicação.')
    estado.antes(path)
    estado.arquivos[path] = dados
    estado.tocados.add(path)


def apos_confirmar(acao):
    estado = _atual.get()
    if estado is None:
        raise RuntimeError('Limpeza sem unidade de publicação.')
    estado.ao_confirmar.append(acao)
