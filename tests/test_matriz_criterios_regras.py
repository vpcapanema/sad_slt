import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_acervo_anterior_preserva_dimensoes_e_nomes_dos_criterios():
    data = json.loads((ROOT / 'config' / 'matriz-criterios-premissas.json').read_text(encoding='utf-8'))
    rows = data['Criterios'][1:]
    matrix = data['Matriz de Criterios e Premissas'][1:]
    assert len(rows) == len(matrix) == 55
    counts = Counter(row[0] for row in rows)
    assert len(counts) == 9
    for dimension in data['Dimensoes de Criterios'][1:]:
        assert counts[dimension[1]] == int(dimension[2])
    assert len({row[2] for row in rows}) == 55
    for criterion, entry in zip(rows, matrix):
        assert criterion[0] == entry[0]
        assert criterion[2] == entry[1]
        assert not criterion[2].startswith(('Quanto maior ', 'Preferir ', 'Priorizar '))
        assert criterion[3:] == [entry[3], entry[6]]
        assert entry[2] and entry[4] and entry[5]


def test_exportacao_nao_substitui_criterios_por_premissas_direcionais():
    from scripts.export_matriz_excel import CRITERIOS
    data = json.loads((ROOT / 'config' / 'matriz-criterios-premissas.json').read_text(encoding='utf-8'))
    rules = [row[2] for row in data['Criterios'][1:]]
    assert len(CRITERIOS) == len(rules) == 55
    assert all(not row[1].startswith(('Quanto maior ', 'Preferir ', 'Priorizar ')) for row in CRITERIOS)
    assert "Populacao beneficiada" in rules
    assert "Capex (custo de investimento)" in rules
