"""Classificação lê só um atributo da fonte original, nunca exporta geometrias."""
import math
import pandas as pd

from api.services import bancada_camada_original as original
from api.services.geoespacial_service import geoespacial_service


def classificar(ident, arquivo, revisao, campo, metodo="intervalos_iguais", classes=5, dominio=None, *, _source=None):
    fonte = _source or original._fonte(ident, arquivo)
    if original._revisao(fonte) != revisao:
        raise ValueError("O arquivo mudou desde a abertura. Reabra antes de classificar.")
    signature = original._assinatura_local(fonte.caminho) if fonte.local else None
    dataset, camada = original._abrir(fonte)
    try:
        campos = [item["nome"] for item in original._campos(camada)]
        if campo not in campos:
            raise ValueError(f"Campo '{campo}' inexistente na camada")
        camada.SetIgnoredFields([nome for nome in campos if nome != campo] + ["OGR_GEOMETRY"])
        camada.ResetReading()
        valores = []
        while True:
            feature = camada.GetNextFeature()
            if feature is None:
                break
            valores.append(original._json_value(feature.GetField(campo)))
        if (fonte.local and signature != original._assinatura_local(fonte.caminho)) or original._revisao(fonte) != revisao:
            raise ValueError("O arquivo mudou durante a classificação. Reabra a camada.")
        serie = pd.Series(valores, dtype=object)
        if dominio is not None:
            minimo, maximo = dominio
            if not math.isfinite(minimo) or not math.isfinite(maximo) or minimo >= maximo:
                raise ValueError("Domínio numérico inválido para classificação.")
            serie = serie[pd.to_numeric(serie, errors="coerce").between(minimo, maximo)]
        return geoespacial_service.classificar_serie(ident, campo, serie, metodo, classes)
    finally:
        camada = None
        dataset = None
