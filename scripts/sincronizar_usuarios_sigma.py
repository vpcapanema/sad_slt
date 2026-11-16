"""Atualiza os vínculos locais a partir do SIGMA, sem copiar credenciais.

Uso: .venv/Scripts/python.exe scripts/sincronizar_usuarios_sigma.py [--migrar] [--simular]
A consulta SIGMA é somente leitura; a escrita SICARD é atômica.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.services.usuarios_sigma_sync import sincronizar


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--migrar', action='store_true', help='Aplicar as migrations 167/168 antes de sincronizar.')
    parser.add_argument('--simular', action='store_true', help='Validar e reverter toda a transação.')
    args = parser.parse_args()
    try:
        resultado = sincronizar(migrar=args.migrar, simular=args.simular)
    except Exception as exc:
        # Exceções de conexão podem incluir detalhes protegidos; não imprimir DSN ou registros.
        print('Falha na sincronizacao: ' + type(exc).__name__, file=sys.stderr)
        return 1
    print(json.dumps(dict(simulacao=args.simular, **resultado), ensure_ascii=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
