"""Identidade de subcamadas, inclusive registros anteriores ao campo explícito."""
from pathlib import Path
import re


def alias_camada(value: str) -> str:
    text = Path(str(value)).stem
    text = re.sub(r"(?<=[a-zà-öø-ÿ0-9])(?=[A-ZÀ-ÖØ-Þ])", " ", text)
    text = re.sub(r"(?<=[A-ZÀ-ÖØ-Þ])(?=[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ])", " ", text)
    text = re.sub(r"[_\-.]+", " ", text)
    return re.sub(r"\s+", " ", text).strip().title() or "Camada"


def resolver_camada(caminho, registro: dict) -> str:
    from osgeo import gdal
    ds = gdal.OpenEx(str(caminho), gdal.OF_VECTOR | gdal.OF_READONLY)
    if ds is None:
        raise ValueError('GDAL não conseguiu abrir o arquivo registrado.')
    names = [ds.GetLayer(i).GetName() for i in range(ds.GetLayerCount())]
    ds = None
    metadata = registro.get('metadados') or {}
    nested = metadata.get('metadados') or {}
    explicit = (registro.get('camada_arquivo') or metadata.get('camada_arquivo')
                or nested.get('camada_arquivo'))
    if explicit:
        if explicit not in names:
            raise ValueError(f"Subcamada registrada não encontrada: {explicit}")
        return explicit
    if len(names) == 1:
        return names[0]
    # Compatibilidade com registros antigos: nunca escolher a primeira camada.
    label = registro.get('nome') or metadata.get('nome')
    matches = [name for name in names if name == label or alias_camada(name) == label]
    if len(matches) == 1:
        return matches[0]
    raise ValueError('Não foi possível identificar uma única subcamada do arquivo registrado.')
