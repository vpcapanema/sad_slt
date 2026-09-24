"""Regras por base do cruzamento configurável.

Etapa 2 de documentacao/geoespacial/FLUXO_CRUZAMENTO_ESPACIAL_CONFIGURAVEL.md. As
bases ficam agrupadas em temas (as categorias da extração) e cada base leva:

* papel: ``recorte`` divide as entradas nos seus limites (município, bacia, zona);
  ``atributos`` só acrescenta informação;
* ligação: ``localizacao`` com um predicado espacial, ou ``atributo`` por chave comum;
* multiplicidade: o que fazer quando o registro toca mais de uma feição da base;
* campos a trazer, prefixo e apelidos;
* preparação: buffer, correção de geometria e separação por tipo de geometria.

Base sem regra informada usa o padrão: atributos por localização (intersecta),
feição de maior sobreposição, todos os campos, prefixo derivado do nome da camada,
geometrias corrigidas e separadas por tipo.
"""
from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator

from api.services.ciclo_vida_arquivos import apelido

PAPEIS = ('atributos', 'recorte')
LIGACOES = ('localizacao', 'atributo')
PREDICADOS = ('intersecta', 'contem', 'esta_dentro')
Estatistica = Literal['media', 'moda', 'mediana', 'total', 'minimo', 'maximo', 'desvio_padrao', 'variancia', 'contagem']

MULTIPLICIDADES = ('maior_sobreposicao', 'primeira', 'todas', 'resumo')

# Nome de campo aceito por GeoPackage, Shapefile renomeado e planilhas sem aspas.
_NOME_CAMPO = re.compile(r'[A-Za-z_][A-Za-z0-9_]{0,62}')
_PREFIXO = re.compile(r'[a-z][a-z0-9_]{0,38}_')


def _limpar_campos(valor):
    if valor is None:
        return None
    limpos = [str(campo).strip() for campo in valor]
    if any(not campo or len(campo) > 255 for campo in limpos):
        raise ValueError('Campo vazio ou com mais de 255 caracteres na lista de campos.')
    if len(set(limpos)) != len(limpos):
        raise ValueError('Campo repetido na lista de campos.')
    return limpos


class Preparacao(BaseModel):
    buffer_m: float | None = Field(default=None, gt=0, le=100_000)
    corrigir_geometrias: bool = True
    separar_por_tipo: bool = True


class RegraBase(BaseModel):
    papel: Literal['atributos', 'recorte'] = 'atributos'
    ligacao: Literal['localizacao', 'atributo'] = 'localizacao'
    predicado: Literal['intersecta', 'contem', 'esta_dentro'] = 'intersecta'
    chave_entrada: str | None = Field(default=None, max_length=255)
    chave_base: str | None = Field(default=None, max_length=255)
    multiplicidade: Literal['maior_sobreposicao', 'primeira', 'todas', 'resumo'] = 'maior_sobreposicao'
    estatistica: Estatistica = 'media'
    estatisticas_campos: dict[str, Estatistica] = Field(default_factory=dict, max_length=10000)
    campos: list[str] | None = Field(default=None, max_length=10000)
    prefixo: str | None = Field(default=None, max_length=40)
    apelidos: dict[str, str] = Field(default_factory=dict, max_length=5000)
    preparacao: Preparacao = Field(default_factory=Preparacao)

    @field_validator('campos')
    @classmethod
    def _campos(cls, valor):
        return _limpar_campos(valor)

    @field_validator('prefixo')
    @classmethod
    def _prefixo(cls, valor):
        if valor is None or not str(valor).strip():
            return None
        valor = str(valor).strip().lower()
        if not valor.endswith('_'):
            valor += '_'
        if not _PREFIXO.fullmatch(valor):
            raise ValueError('Prefixo deve começar com letra e usar só letras minúsculas, números e sublinhado.')
        return valor

    @field_validator('apelidos')
    @classmethod
    def _apelidos(cls, valor):
        limpos = {str(campo).strip(): str(texto).strip() for campo, texto in valor.items()}
        if any(not campo or not texto or len(texto) > 255 for campo, texto in limpos.items()):
            raise ValueError('Apelido vazio ou com mais de 255 caracteres.')
        return limpos

    @model_validator(mode='after')
    def _coerencia(self):
        if self.ligacao == 'atributo':
            if not self.chave_entrada or not self.chave_base:
                raise ValueError('Ligação por atributo exige a chave da entrada e a chave da base.')
        elif self.chave_entrada or self.chave_base:
            raise ValueError('Chaves de ligação só se aplicam à ligação por atributo.')
        if self.papel == 'recorte':
            if self.ligacao != 'localizacao':
                raise ValueError('A unidade de recorte divide as entradas pela geometria: use ligação por localização.')
            if self.preparacao.buffer_m:
                raise ValueError('A unidade de recorte não aceita buffer: o recorte segue os limites da própria base.')
        if self.campos is not None and self.apelidos:
            fora = sorted(set(self.apelidos) - set(self.campos))
            if fora:
                raise ValueError(f'Apelido para campo que não está na lista de campos: {", ".join(fora)}.')
        return self


class FiltroEntrada(BaseModel):
    """Seleção das feições de uma entrada. Valores comparados como texto sem espaços nas pontas."""
    campo: str = Field(min_length=1, max_length=255)
    operador: Literal['igual', 'diferente', 'preenchido', 'em'] = 'preenchido'
    valor: str | list[str] | None = None

    @model_validator(mode='after')
    def _coerencia(self):
        if self.operador in ('igual', 'diferente') and not isinstance(self.valor, str):
            raise ValueError('Filtro "igual" ou "diferente" exige um valor de texto.')
        if self.operador == 'em' and (not isinstance(self.valor, list) or not self.valor):
            raise ValueError('Filtro "em" exige uma lista de valores.')
        if self.operador == 'preenchido':
            self.valor = None
        return self


class ConfigEntrada(BaseModel):
    campo_id: str | None = Field(default=None, max_length=255)
    filtro: FiltroEntrada | None = None
    campos: list[str] | None = Field(default=None, max_length=5000)

    @field_validator('campos')
    @classmethod
    def _campos(cls, valor):
        return _limpar_campos(valor)


class Finalidade(BaseModel):
    """Recorte por finalidade: subconjunto nomeado de campos das camadas de saída."""
    nome: str = Field(min_length=1, max_length=60)
    campos: list[str] = Field(min_length=1, max_length=5000)

    @field_validator('campos')
    @classmethod
    def _campos(cls, valor):
        return _limpar_campos(valor)


def _mensagem(exc: ValidationError) -> str:
    return ' '.join(dict.fromkeys(erro['msg'].removeprefix('Value error, ') for erro in exc.errors()))


def normalizar_entrada(config: dict | None) -> dict:
    try:
        return ConfigEntrada.model_validate(config or {}).model_dump()
    except ValidationError as exc:
        raise ValueError(_mensagem(exc)) from exc


def normalizar_finalidades(finalidades: list | None) -> list[dict]:
    saida, vistos = [], set()
    for item in finalidades or []:
        try:
            dados = Finalidade.model_validate(item).model_dump()
        except ValidationError as exc:
            raise ValueError(_mensagem(exc)) from exc
        chave = apelido(dados['nome'], 40) or 'finalidade'
        if chave in vistos:
            raise ValueError(f'Finalidade repetida: {dados["nome"]}.')
        vistos.add(chave)
        saida.append({**dados, 'chave': chave})
    return saida


def prefixo_padrao(nome_camada: str) -> str:
    texto = (apelido(nome_camada, 30) or 'base').lower()
    # Campo que começa por dígito exige aspas em SQL e confunde planilhas.
    return f"{'b' + texto if texto[0].isdigit() else texto}_"


def normalizar(regra: dict | RegraBase | None) -> dict:
    """Regra validada e completa, pronta para gravar na configuração ou na execução."""
    if isinstance(regra, RegraBase):
        return regra.model_dump()
    try:
        return RegraBase.model_validate(regra or {}).model_dump()
    except ValidationError as exc:
        mensagens = [erro['msg'].removeprefix('Value error, ') for erro in exc.errors()]
        raise ValueError(' '.join(dict.fromkeys(mensagens))) from exc


def validar_conjunto(categorias: list[dict]) -> list[dict]:
    """Regras de todas as bases da execução, com as restrições que valem entre bases.

    ``categorias``: [{id, camadas: [{id, nome, regra?}]}]. Devolve a mesma estrutura
    com ``regra`` normalizada e ``prefixo`` resolvido em cada camada.
    """
    recortes, prefixos, saida = [], {}, []
    for categoria in categorias:
        camadas = []
        for camada in categoria['camadas']:
            regra = normalizar(camada.get('regra'))
            if regra['papel'] == 'recorte':
                recortes.append(camada.get('nome') or camada['id'])
            prefixo = regra['prefixo'] or prefixo_padrao(camada.get('nome') or camada['id'])
            base, conta = prefixo[:-1], 2
            # Prefixo informado pelo usuário não é renomeado: repetir é erro.
            while prefixo in prefixos:
                if regra['prefixo']:
                    raise ValueError(f'O prefixo {prefixo} está em mais de uma base: '
                                     f'{prefixos[prefixo]} e {camada.get("nome") or camada["id"]}.')
                prefixo, conta = f'{base}{conta}_', conta + 1
            prefixos[prefixo] = camada.get('nome') or camada['id']
            camadas.append({**camada, 'regra': {**regra, 'prefixo': prefixo}})
        saida.append({**categoria, 'camadas': camadas})
    if len(recortes) > 1:
        raise ValueError(f'Só uma base pode ser a unidade de recorte; foram marcadas: {", ".join(recortes)}.')
    return saida


def categoria_binaria(categoria: dict) -> bool:
    """Categorias oficiais; não inferir risco pelo nome do arquivo da base."""
    import unicodedata
    def chave(valor):
        return unicodedata.normalize('NFKD', str(valor or '')).encode('ascii', 'ignore').decode().lower().strip()
    return any(chave(categoria.get(c)) in ('risco', 'riscos', 'restricao', 'restricoes') for c in ('id', 'nome'))


def normalizar_estatisticas(categorias: list[dict]) -> list[dict]:
    """Contrato atual: interseção real, todos os campos, nenhuma divisão/duplicação."""
    grupos = []
    for categoria in categorias:
        camadas = []
        for camada in categoria['camadas']:
            regra = dict(camada.get('regra') or {})
            regra.update(papel='atributos', ligacao='localizacao', predicado='intersecta',
                         chave_entrada=None, chave_base=None, multiplicidade='resumo', campos=None,
                         preparacao={'buffer_m': None, 'corrigir_geometrias': True, 'separar_por_tipo': False})
            camadas.append({**camada, 'regra': regra})
        grupos.append({**categoria, 'camadas': camadas})
    return validar_conjunto(grupos)
