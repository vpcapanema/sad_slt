"""Leitura de pacotes enviados pelo SFTPGo sem modificar seu algoritmo de upload.

O pacote permanece intacto no storage; componentes e geometrias são abertos
sob demanda em RAM, pelo mesmo leitor usado na preparação de entradas.
"""
from api.services.pacote_geoespacial_memoria import COMPACTADOS, componentes, abrir


def conteudo(arquivo):
    from api.services.extracao_entrada_local import MAX_ARQUIVO
    if arquivo.stat().st_size > MAX_ARQUIVO:
        raise ValueError('Pacote salvo no storage, mas a leitura em memória de pacotes aceita até 16 MB. Envie os dados descompactados para usar arquivos maiores.')
    return arquivo.read_bytes()


def inventario(arquivo, relativo):
    from api.services.extracao_entrada_local import MAX_DESCOMPACTADO
    with abrir(componentes(conteudo(arquivo), arquivo.name, MAX_DESCOMPACTADO), incluir_invalidas=True) as (opcoes, _, _raiz):
        itens=[]
        for o in opcoes:
            item={'id':f"storage:{relativo}::{o['chave']}", 'nome':o['nome'],
                  'camada':o['chave'], 'tipo':o['tipo'], 'arquivo':relativo}
            if o.get('erro'):
                item['erro']=str(o['erro'])
            elif o['tipo']=='vetor':
                lyr=o['layer'];srs=lyr.GetSpatialRef()
                item.update(crs=srs.ExportToWkt() if srs else None,feicoes=lyr.GetFeatureCount())
            itens.append(item)
        return itens


def carregar(arquivo, camada):
    from api.services.extracao_entrada_local import ler
    frame,meta=ler(conteudo(arquivo), arquivo.name, camada)
    if frame is None:
        raise ValueError('Selecione uma camada vetorial dentro do pacote.')
    return frame,meta


def previa(arquivo, camada, ident, relativo):
    from api.services.extracao_entrada_local import _camada_previa
    frame,meta=carregar(arquivo,camada)
    item=_camada_previa(frame,meta)
    item.update(id=ident,arquivo=relativo,origem='storage',origem_geometria='storage')
    return item
