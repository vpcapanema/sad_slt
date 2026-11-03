"""Remapeamento compartilhado por migração e republicação de referências."""
import re
import json
from io import BytesIO
from urllib.parse import quote
from urllib.parse import unquote


IMUTAVEIS = {'logs', 'auditoria', 'historico', 'eventos', 'historico_homologacao', 'historico_publicacao'}


def metadados_arquivo(path, dados):
    if not path.lower().endswith('.gpkg'):
        return {}
    import pyogrio
    resultado = {}
    for camada, _ in pyogrio.list_layers(BytesIO(dados)):
        info = pyogrio.read_info(BytesIO(dados), layer=camada)
        metadata = info.get('layer_metadata') or {}
        for campo, chave in (('elegibilidade', 'SICARD_ELEGIBILIDADE'),
                              ('favorabilidade', 'SICARD_FAVORABILIDADE'),
                              ('normalizacao_demanda', 'SICARD_NORMALIZACAO')):
            if chave in metadata:
                valor = json.loads(metadata[chave])
                if not isinstance(valor, dict):
                    raise ValueError('Metadados da saída republicada são inválidos.')
                resultado[campo] = valor
                resultado['descritor'] = {
                    'feicoes': info['features'], 'bounds': list(info['total_bounds']),
                    'crs': info['crs']}
    return resultado


class Remapeamento:
    def __init__(self, caminhos, hashes=None, tamanhos=None, ids=None, *, preservar_urls=False):
        self.preservar_urls = preservar_urls
        self.tokens = {}
        self.brutos = {}
        for origem, destino in caminhos.items():
            for prefixo in ('', '/', 'storage:'):
                self.brutos[prefixo + origem] = prefixo + destino
        self.tokens.update(self.brutos)
        for origem, destino in caminhos.items():
            for prefixo in ('', '/', 'storage:'):
                for seguro in ('', '/'):
                    antes, depois = prefixo + origem, prefixo + destino
                    antes, depois = quote(antes, safe=seguro), quote(depois, safe=seguro)
                    # Uma origem ASCII pode coincidir com seu alias URL, mas seu
                    # destino Unicode não deve contaminar caminhos físicos raw.
                    self.tokens.setdefault(antes, depois)
        alternativas = '|'.join(re.escape(s) for s in sorted(self.tokens, key=len, reverse=True))
        self.pattern = re.compile(
            r"(?<![\w./%+-])(?:" + alternativas
            + r")(?=$|::|%3[Aa]%3[Aa]|%26|%3[Ff]|%23|[?&#\s\"'<>\]\)},;])"
        ) if alternativas else None
        self.hashes, self.tamanhos, self.ids = hashes or {}, tamanhos or {}, ids or {}

    def texto(self, texto):
        if texto in self.hashes:
            return self.hashes[texto]
        url = texto.lower().startswith(('http://', 'https://')) or (texto.startswith('/') and '?' in texto)
        if url and self.preservar_urls:
            return texto
        def substituir(match):
            token = match.group()
            destino = self.tokens[token]
            return quote(destino, safe='/:') if url and token in self.brutos else destino
        return self.pattern.sub(substituir, texto) if self.pattern else texto

    def valor(self, valor, *, revisao=False):
        if isinstance(valor, str):
            return self.texto(valor)
        if isinstance(valor, list):
            return [self.valor(v, revisao=revisao) for v in valor]
        if isinstance(valor, dict):
            preservar = IMUTAVEIS | {'elegibilidade', 'favorabilidade'} | ({'nomes'} if revisao else set())
            novo = {}
            for k, v in valor.items():
                chave = self.texto(k)
                if chave in novo:
                    raise ValueError('O remapeamento causaria colisão de chaves.')
                novo[chave] = v if k in preservar else self.valor(v, revisao=revisao)
            for campo in ('arquivo', 'caminho', 'storage_caminho'):
                path = valor.get(campo)
                if isinstance(path, str) and path in self.tamanhos:
                    for key in ('tamanho_bytes', 'tamanho'):
                        if key in novo:
                            novo[key] = self.tamanhos[path]
                    if isinstance(novo.get('revisao'), str) and re.fullmatch(r'\d+-\d+', novo['revisao']):
                        novo['revisao'] = novo['revisao'].rsplit('-', 1)[0] + '-' + str(self.tamanhos[path])
            if isinstance(novo.get('arquivo_exportado_id'), str):
                novo['arquivo_exportado_id'] = self.ids.get(novo['arquivo_exportado_id'], novo['arquivo_exportado_id'])
            return novo
        return valor


def atualizar_referencias(valor, arquivos, contexto=None):
    """Hashes são vinculados ao caminho, nunca substituídos globalmente por coincidência."""
    if isinstance(valor, list):
        return [atualizar_referencias(v, arquivos, contexto) for v in valor]
    if not isinstance(valor, dict):
        return valor
    for campo in ('arquivo', 'caminho', 'storage_caminho', 'caminho_arquivo', 'id'):
        path = valor.get(campo)
        if isinstance(path, str):
            if campo == 'id' and not path.startswith('storage:'):
                contexto = None
                break
            path = unquote(path).removeprefix('storage:').lstrip('/').split('::', 1)[0]
            contexto = path if path in arquivos else None
            break
    novo = {k: v if k in IMUTAVEIS else atualizar_referencias(v, arquivos, contexto)
            for k, v in valor.items()}
    for campo, path in valor.items():
        if campo in arquivos and isinstance(path, str) and re.fullmatch(r'[a-f0-9]{64}', path):
            novo[campo] = arquivos[campo]['sha256']
        if campo.endswith('_caminho') and isinstance(path, str) and path in arquivos:
            prefixo = campo.removesuffix('_caminho')
            for sufixo in ('sha256', 'tamanho_bytes'):
                chave = prefixo + '_' + sufixo
                if chave in novo:
                    novo[chave] = arquivos[path][sufixo]
    if contexto in arquivos:
        meta = arquivos[contexto]
        for campo in ('elegibilidade', 'favorabilidade', 'normalizacao_demanda'):
            if campo in novo and campo in meta:
                novo[campo] = meta[campo]
        if any(campo in valor for campo in ('arquivo', 'caminho', 'storage_caminho', 'id')):
            for campo, conteudo in meta.get('descritor', {}).items():
                if campo in novo:
                    novo[campo] = conteudo
            for campo in ('geojson', 'tiles_token', 'previa_reutilizavel'):
                novo.pop(campo, None)
        for campo in ('sha256', 'checksum'):
            if campo in novo:
                novo[campo] = meta['sha256']
        for campo in ('tamanho_bytes', 'tamanho'):
            if campo in novo:
                novo[campo] = meta['tamanho_bytes']
        if isinstance(novo.get('revisao'), str) and re.fullmatch(r'\d+-\d+', novo['revisao']):
            from api.services.storage_geoespacial import resolver
            estado = resolver(contexto).stat()
            novo['revisao'] = f'{estado.st_mtime_ns}-{estado.st_size}'
    return novo
