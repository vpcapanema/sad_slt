"""Gera metadados dos agregados setoriais oficiais sem carregar seus valores."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts import completar_setores_2022 as carga
from scripts.fontes_setoriais_2022 import FONTES, url_fonte


def preparar(insumos: Path) -> dict:
    descriptions, _ = carga.preparar_dicionarios(insumos)
    attributes = []
    sources = []
    for name, file, theme in FONTES:
        url = url_fonte(name, file)
        path = carga.baixar(insumos, file, url)
        with carga.abrir_csv(path) as reader:
            _, fields = carga.campos_csv(reader, name, descriptions)
        for column, (key, declared_unit) in fields.items():
            description = descriptions.get(column.upper(), {}).get('descricao', column)
            unit = declared_unit or carga.unidade(
                name, column.upper(), description,
                descriptions.get(column.upper(), {}).get('tipo', ''),
            )
            if name == 'registro_nascimento':
                key, unit = carga.COLUNAS_NASCIMENTO[column]
                description = f'Registro de nascimento por setor: {column}'
            entry_theme = '01_populacao' if name == 'basico' and column.upper() == 'V0001' else theme
            field = f'setor_{key}_2022'
            attributes.append({
                'id': carga.identificador(field),
                'campo': field,
                'chave': key,
                'origem': 'originais',
                'fonte': 'IBGE / Censo 2022 - setores',
                'ano': 2022,
                'tema': entry_theme,
                'rotulo': description,
                'unidade': unit,
                'url': url,
                'detalhe': {
                    'origem_valor': 'originais',
                    'campo_original': column,
                    'conjunto': name,
                    'definicao': description,
                    'dicionario': descriptions.get(column.upper(), {}).get('dicionario', url),
                    'nota': 'Metadados de catálogo. Os valores são obtidos da fonte oficial sob demanda.',
                },
                'cobertura': None,
            })
        sources.append({
            'conjunto': name,
            'url': url,
            'campos': len(fields),
            'territorialidade': 'setores_2022',
            'carregamento': 'sob_demanda',
        })
    if len(attributes) != 3519 or len({item['chave'] for item in attributes}) != 3519:
        raise ValueError('Os metadados não cobrem exatamente os 3.519 campos oficiais.')
    legacy_report = json.loads(
        (Path(__file__).resolve().parents[1] / 'config/catalogo-territorial-incorporado.json')
        .read_text(encoding='utf-8')
    )
    combined = [item for item in legacy_report['atributos_setoriais'] if item['origem'] == 'combinados']
    return {
        'referencia': 2022,
        'estrategia': 'catalogo_de_metadados_com_valores_carregados_sob_demanda',
        'completude': {'metadados_completos': True},
        'malha': {'setores': 103319, 'partes': 103620},
        'atributos_setoriais': attributes + combined,
        'conjuntos_setoriais': sources,
        'combinados_municipais': legacy_report.get('combinados_municipais', []),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--insumos', type=Path, required=True)
    parser.add_argument('--saida', type=Path, default=Path('config/catalogo-setorial-on-demand.json'))
    args = parser.parse_args()
    report = preparar(args.insumos)
    args.saida.parent.mkdir(parents=True, exist_ok=True)
    args.saida.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"Catálogo preparado: {len(report['atributos_setoriais'])} metadados; valores não carregados.")


if __name__ == '__main__':
    main()
