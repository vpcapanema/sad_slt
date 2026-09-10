"""Execute no servidor que possui o storage. Consulta por padrão; --executar grava."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.db.connection import get_connection
from api.services import ciclo_vida_arquivos as ciclo


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('acao', choices=['regularizar', 'reter'])
    parser.add_argument('--executar', action='store_true')
    parser.add_argument('--responsavel')
    parser.add_argument('--recurso-id', help='Restringe a regularização a uma camada.')
    args = parser.parse_args()
    if args.executar and not args.responsavel:
        parser.error('--executar exige --responsavel para auditoria')
    if args.acao == 'reter':
        print(json.dumps(ciclo.limpar(args.responsavel or 'consulta_cli', args.executar), ensure_ascii=False))
        return 0
    with get_connection() as conn:
        rows = conn.execute('''SELECT c.recurso_sessao_id,c.nome,c.tipo
            FROM geoprocessamento.camada_processada c
            LEFT JOIN geoprocessamento.arquivo_resultado a ON a.camada_id=c.id
            WHERE a.id IS NULL AND (%s::text IS NULL OR c.recurso_sessao_id=%s)
            ORDER BY c.criado_em''',(args.recurso_id,args.recurso_id)).fetchall()
    failed = 0
    for row in rows:
        result = dict(row)
        if args.executar:
            try:
                result.update(ciclo.regularizar(row['recurso_sessao_id'],args.responsavel))
            except Exception as exc:
                failed += 1
                # Erros de conexão podem conter credenciais; não imprimir o DSN.
                result.update(erro=type(exc).__name__,estado='nao_regularizado')
        else:
            result['estado'] = 'candidato_sem_alteracao'
        print(json.dumps(result, ensure_ascii=False, default=str), flush=True)
    print(json.dumps({'executado':args.executar,'candidatos':len(rows),'falhas':failed}))
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
