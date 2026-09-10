"""Criação de subpastas nas áreas públicas do storage geoespacial."""
import re
from api.path_policy import project_path, relative_path


def _destino(caminho: str, nome: str):
    from api.routers.geoespacial import RAIZES_CARREGAVEIS
    if (not nome or nome != nome.strip() or nome.startswith('.') or nome.endswith('.')
            or re.search(r'[<>:"/\\|?*\x00-\x1f]',nome)
            or re.fullmatch(r'(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?',nome,re.I)):
        raise ValueError('Informe um nome de pasta válido, sem barras ou caracteres reservados.')
    relative = relative_path(caminho).as_posix()
    roots = [r['caminho'] for r in RAIZES_CARREGAVEIS.values()]
    if not any(relative == base or relative.startswith(base+'/') for base in roots):
        raise ValueError('Selecione Entradas, Biblioteca canônica ou Saídas para criar uma subpasta.')
    if any(part.startswith('.') for part in relative.split('/')):
        raise ValueError('Pastas internas não podem ser alteradas pelo explorador.')
    root = project_path('data/geoespacial').resolve()
    parent = (root / relative).resolve()
    if not parent.is_relative_to(root):
        raise ValueError('Caminho fora do storage geoespacial.')
    permitted = next(base for base in roots if relative == base or relative.startswith(base+'/'))
    # Também impede atravessar links de uma área para outra.
    if not parent.is_relative_to(root / permitted):
        raise ValueError('Caminho fora da área selecionada.')
    if not parent.is_dir():
        raise FileNotFoundError('Pasta de destino não encontrada.')
    target = parent / nome
    return parent, target, relative


def criar_pasta(caminho: str, nome: str) -> dict:
    parent, target, relative = _destino(caminho,nome)
    target.mkdir()  # Sem sobrescrever e sem criar pais arbitrários.
    return {'nome':nome,'caminho':relative+'/'+nome}


def renomear_pasta(caminho: str, nome: str) -> dict:
    from api.routers.geoespacial import RAIZES_CARREGAVEIS
    relative=relative_path(caminho).as_posix()
    if relative in {r['caminho'] for r in RAIZES_CARREGAVEIS.values()}:
        raise ValueError('As pastas principais do storage não podem ser renomeadas.')
    parent_path,_,old_name=relative.rpartition('/')
    parent,target,_=_destino(parent_path,nome)
    source=parent/old_name
    if old_name.startswith('.') or source.is_symlink() or not source.resolve().is_relative_to(parent):
        raise ValueError('Pasta interna ou caminho inválido.')
    if not source.is_dir():raise FileNotFoundError('Pasta não encontrada.')
    if target.exists():raise FileExistsError('Nome já utilizado.')
    if any(source.iterdir()):
        raise ValueError('Só é possível renomear pastas vazias. Pastas com conteúdo possuem caminhos que precisam ser preservados.')
    source.rename(target)
    return {'nome':nome,'caminho':parent_path+'/'+nome}
