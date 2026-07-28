import collections
import re

s = open(r"d:\REPOSITORIOS\sistema_apoio_a_tomada_de_decisao_web\templates\paginas\hierarquizacao\home.html", encoding="utf-8").read()
ids = re.findall(r'id="([^"]+)"', s)
dups = [k for k, v in collections.Counter(ids).items() if v > 1]
print("total ids:", len(ids))
print("duplicados:", dups or "nenhum")
