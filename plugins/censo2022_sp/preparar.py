"""Baixa fontes oficiais e inspeciona metadados. Execute a partir desta pasta."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json, requests, zipfile

ROOT = Path(__file__).resolve().parent
API = 'https://servicodados.ibge.gov.br/api/v3/agregados'
GROUPS = {
 '01_populacao': [4709,4714,9514,9515,9923],
 '02_cor_raca': [9605,9606,9756],
 '03_domicilios': [4711,4712,6326,9866,9877,9880,9922],
 '04_saneamento': [6803,6804,6805,6806,6892,6894,6909,7555,9397,9541],
 '05_educacao': [9542,9543,10056,10057,10058,10059,10061,10062],
 '06_renda': [10280,10289,10292,10295,10296,10297,10299],
 '07_trabalho': [6580,9517,10261,10262,10263,10264,10268,10269],
 '08_habitacao_internet': [9928,9929,9930,9931,9933,9935,9936],
 '09_entorno_urbano': [9583,9584,9586,9587,10055],
 '10_indigenas': [9608,9718,9720,8180,8181,9955],
 '11_quilombolas': [9578,9724,10089,10091,10097],
 '12_deficiencia_autismo': [10125,10126,10127,10128,10130,10133,10145,10147,10153],
 '13_migracao': [631,2145,3182,10157,10158,10160,10161],
 '14_familias_fecundidade': [9881,9882,10175,10176,10183,10075,10078],
 '15_religiao': [9537,10198,10199],
 '16_deslocamentos': [10321,10324,10329,10330,10331,10332],
 '17_favelas': [9883,9887,9888,9889,9890,9891,9892,9893],
 '18_registro_obitos': [6740,9872,6584],
}

def get(url):
    for attempt in range(3):
        try:
            r=requests.get(url,timeout=120); r.raise_for_status(); return r
        except requests.RequestException:
            if attempt == 2: raise

def metadata(t):
    p=ROOT/'fontes'/f'metadados_{t}.json'
    if not p.exists(): p.write_text(json.dumps(get(f'{API}/{t}/metadados').json(),ensure_ascii=False,indent=2),encoding='utf-8')
    return json.loads(p.read_text(encoding='utf-8'))

if __name__=='__main__':
    (ROOT/'fontes').mkdir(exist_ok=True)
    catalog=json.loads((ROOT/'fontes/catalogo_municipal.json').read_text(encoding='utf-8'))
    ids={int(x['id']) for x in catalog['agregados']}
    assert all(t in ids for ts in GROUPS.values() for t in ts)
    url='https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/UFs/SP/SP_Municipios_2022.zip'
    z=ROOT/'fontes/SP_Municipios_2022.zip'
    if not z.exists(): z.write_bytes(get(url).content)
    dest=ROOT/'malha_original'; dest.mkdir(exist_ok=True)
    with zipfile.ZipFile(z) as f: f.extractall(dest)
    with ThreadPoolExecutor(max_workers=4) as pool:
        for m in pool.map(metadata,[t for ts in GROUPS.values() for t in ts]):
            print(m['id'],len(m['variaveis']),[(c['id'],c['nome'],len(c['categorias']),[x['id'] for x in c['categorias'] if x['nome']=='Total']) for c in m['classificacoes']],flush=True)
