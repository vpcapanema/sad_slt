"""Fontes cartográficas sintéticas para testes de contratos de relatório legados."""
from shapely.geometry import box

from api.services import cartografia_relatorio_fases as cartografia


def preparar_fontes(monkeypatch):
    limite = box(4999900, 6999900, 5001500, 7000200)
    monkeypatch.setattr(cartografia, 'limite_sp', lambda: limite)
    monkeypatch.setattr(cartografia, '_vetor', lambda base, recorte: (
        [box(5000000, 7000000, 5001200, 7000010)],
        [{'fav_territorial_dim': .7, 'fav_rede_dim': .3}], None, 0))
