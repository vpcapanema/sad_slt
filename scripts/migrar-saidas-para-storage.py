"""Migração de saídas preservadas. Padrão: inventário; --executar copia e confere hashes."""
from pathlib import Path
import argparse,json,sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1]/'.env')
from api.db.connection import get_connection
from api.services import ciclo_vida_arquivos as ciclo


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--executar',action='store_true')
    parser.add_argument('--raiz-exportacoes',type=Path,help='Raiz da cópia temporária dos arquivos legados; mantém os caminhos relativos originais.')
    args=parser.parse_args()
    with get_connection() as conn:
        layers=conn.execute('SELECT recurso_sessao_id,nome,storage_caminho FROM geoprocessamento.camada_processada').fetchall()
        exports=conn.execute('SELECT id,caminho FROM geoprocessamento.arquivo_exportado').fetchall()
    report={'camadas':[],'exportacoes':[]}
    for row in layers:
        record=ciclo.regularizar(row['recurso_sessao_id']) if args.executar else dict(row)
        report['camadas'].append(record)
    for row in exports:
        record=ciclo.migrar_exportacao(str(row['id']),args.raiz_exportacoes) if args.executar else dict(row)
        report['exportacoes'].append(record)
    print(json.dumps(report,ensure_ascii=False,default=str,indent=2))


if __name__=='__main__':main()
