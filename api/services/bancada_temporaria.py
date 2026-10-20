"""Leitura autenticada de cópias temporárias de entradas locais, sem cadastro."""
import re
from time import time
from api.services import bancada_camada_original as original
from api.services.extracao_preparacao import _pasta, TTL


def consultar(acao, payload, dono):
    token = payload.tiles_token
    if not re.fullmatch(r"[a-f0-9]{32}", token) or payload.revisao != token:
        raise ValueError("Referência temporária inválida. Valide o arquivo novamente.")
    if not re.fullmatch(r"local:[a-f0-9]{32}", payload.id):
        raise ValueError("Identificador temporário inválido.")
    path = _pasta(dono) / f"{token}.gpkg"
    if not path.is_file() or (time() - path.stat().st_mtime > TTL and not path.with_suffix('.pin').exists()):
        raise FileNotFoundError("Prévia expirada. Valide o arquivo novamente.")
    fonte = original.Fonte(payload.id, path, "", "camada", "Arquivo local", {"tipo": "local_temporaria", "token": token}, True)
    args = (payload.id, "", token)
    if acao == 'tabela':
        return original.ler_tabela(*args, payload.offset, payload.limite, _source=fonte,
                                   localizar_fid=payload.localizar_fid)
    if acao == 'geometrias':
        return original.ler_geometrias(*args, payload.ids, _source=fonte)
    if acao == 'consulta':
        return original.consultar(*args, payload.expressao, payload.inverter_selecao, payload.offset, payload.limite, _source=fonte)
    if acao == 'classificacao':
        from api.services.bancada_classificacao import classificar
        return classificar(*args, payload.campo, payload.metodo, payload.classes, getattr(payload, 'dominio', None), _source=fonte)
    raise ValueError("Operação temporária não suportada.")
