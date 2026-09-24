"""Compatibilização espacial em cópias, sem cadastrar ou modificar as fontes."""
import numpy as np
import shapely

CRS_MEDIDA = 5880
CRS_SAIDA = 4674


def normalizar_crs(frame, nome, destino=CRS_MEDIDA):
    """Preserva linhas, campos e geometria original; reprojeta apenas a cópia."""
    if frame.crs is None:
        raise ValueError(f'{nome}: CRS ausente. Defina o sistema de origem; ele não pode ser inferido com segurança.')
    from pyproj import CRS
    from pyproj.exceptions import CRSError, ProjError
    try:
        origem = CRS.from_user_input(frame.crs)
        for inicio in range(0, len(frame), 256):
            coords = shapely.get_coordinates(frame.geometry.iloc[inicio:inicio+256].values)
            if not np.isfinite(coords).all():
                raise ValueError(f'{nome}: coordenadas não finitas na fonte.')
            if origem.is_geographic and len(coords) and (np.abs(coords[:, 0]).max() > 180 or np.abs(coords[:, 1]).max() > 90):
                raise ValueError(f'{nome}: coordenadas incompatíveis com o CRS geográfico declarado.')
        resultado = frame.to_crs(destino).copy()
        for inicio in range(0, len(resultado), 256):
            coords = shapely.get_coordinates(resultado.geometry.iloc[inicio:inicio+256].values)
            if not np.isfinite(coords).all():
                raise ValueError(f'{nome}: não foi possível transformar todas as coordenadas para EPSG:{destino}.')
        return resultado
    except (CRSError, ProjError) as exc:
        raise ValueError(f'{nome}: CRS inválido ou transformação indisponível. Confira o sistema de origem.') from exc


def conferir(camadas, operacao=None):
    """Prepara cada fonte integral usando as mesmas rotinas dos dois algoritmos."""
    from api.services.extracao_entrada_local import restaurar
    from api.services.municipal_layer import carregar_para_extracao
    from api.services.extracao_atributos_enriquecimento import preparar
    from api.services.extracao_atributos_estatisticas import _geometrias_trabalho
    from api.services.extracao_atributos_regras import normalizar

    if sum(len((c.get('arquivo_local') or {}).get('conteudo_base64', '')) for c in camadas) > 30 * 1024 * 1024:
        raise ValueError('Os arquivos locais excedem 30 MB codificados. Reduza o conjunto.')
    resultados, erros = [], []
    for camada in camadas:
        nome = camada.get('nome') or camada['id']
        try:
            if camada.get('arquivo_local'):
                frame, _ = restaurar(camada['arquivo_local'])
            else:
                frame = carregar_para_extracao(camada['id'])
            if frame.empty:
                raise ValueError('A camada não contém feições.')
            if operacao == 'enriquecimento':
                regra = normalizar(camada.get('regra')) if camada['papel'] == 'base' else normalizar(None)
                partes, info = preparar(frame, nome, **{
                    'corrigir': regra['preparacao']['corrigir_geometrias'],
                    'separar': regra['preparacao']['separar_por_tipo'],
                    'buffer_m': regra['preparacao']['buffer_m'],
                })
                if camada['papel'] == 'base' and regra['papel'] == 'recorte' and set(partes) != {2}:
                    raise ValueError('A unidade de recorte precisa conter somente polígonos.')
                corrigidas = info['corrigidas']
                vazias = info['sem_geometria']
                colapsadas = info['colapsadas']
            else:
                trabalho, info = _geometrias_trabalho(frame, nome)
                if not ((~trabalho.isna()) & (~trabalho.is_empty)).any():
                    raise ValueError('A camada não possui geometria utilizável para o cruzamento.')
                colapsadas = 0
                corrigidas = info['corrigidas_para_consulta']
                vazias = info['sem_geometria']
            resultados.append({'id': camada['id'], 'nome': nome, 'papel': camada['papel'],
                               'crs_origem': str(frame.crs), 'crs_trabalho': f'EPSG:{CRS_MEDIDA}',
                               'feicoes': len(frame), 'geometrias_corrigidas_na_copia': corrigidas,
                               'geometrias_vazias': vazias, 'geometrias_colapsadas': colapsadas, 'originais_preservados': True})
        except (ValueError, FileNotFoundError, shapely.errors.GEOSException) as exc:
            erros.append({'id': camada['id'], 'nome': nome, 'motivo': str(exc)})
    return {'compativel': not erros, 'crs_trabalho': f'EPSG:{CRS_MEDIDA}',
            'crs_saida': f'EPSG:{CRS_SAIDA}', 'camadas': resultados, 'erros': erros}
