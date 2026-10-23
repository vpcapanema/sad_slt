from pathlib import Path
import os
os.environ['QT_QPA_PLATFORM'] = 'offscreen'
os.environ['PROJ_DATA'] = str(Path(__file__).resolve().parents[2]/'.venv/Lib/site-packages/pyproj/proj_dir/share/proj')
os.environ['PROJ_LIB'] = os.environ['PROJ_DATA']
import shutil
import sqlite3
import json
from qgis.core import QgsApplication, QgsVectorLayer, QgsFillSymbol, QgsRendererCategory, QgsCategorizedSymbolRenderer

root = Path(__file__).resolve().parent
source = root/'Favorabilidade Rede Trechos pol.gpkg'
target = root/'Favorabilidade Rede Trechos pol estilizado.gpkg'
shutil.copy2(source, target)
app = QgsApplication([], False)
app.initQgis()
layer = QgsVectorLayer(str(target)+'|layername=subtrechos', 'Favorabilidade Rede Trechos', 'ogr')
assert layer.isValid()
palette = [('muito baixa','Muito baixa','#440154'),('baixa','Baixa','#3b528b'),('média','Média','#21918c'),('alta','Alta','#5ec962'),('muito alta','Muito alta','#fde725'),(None,'Sem classe','#808080')]
categories = []
for value, label, color in palette:
    symbol = QgsFillSymbol.createSimple({'color':color, 'outline_style':'no', 'style':'solid'})
    categories.append(QgsRendererCategory(value, symbol, label))
layer.setRenderer(QgsCategorizedSymbolRenderer('fav_rede_classe', categories))
layer.setOpacity(1)
error = layer.saveStyleToDatabase('Favorabilidade rede - classes', 'Classes do atributo fav_rede_classe; paleta Viridis compartilhada com a Fase 2 do SICARD. Sem contorno, preenchimento opaco.', True, '')
assert not error, error
for filename, method in [('Favorabilidade Rede Trechos pol.qml',layer.saveNamedStyle),('Favorabilidade Rede Trechos pol.sld',layer.saveSldStyle)]:
    message, success = method(str(root/filename))
    assert success, message
reopened = QgsVectorLayer(str(target)+'|layername=subtrechos', 'Conferencia', 'ogr')
assert reopened.isValid() and reopened.renderer().type() == 'categorizedSymbol'
assert reopened.renderer().classAttribute() == 'fav_rede_classe'
assert [(c.label(),c.symbol().color().name()) for c in reopened.renderer().categories()] == [(label,color) for _,label,color in palette]
with sqlite3.connect(source) as original, sqlite3.connect(target) as styled:
    assert original.execute('SELECT * FROM subtrechos ORDER BY fid').fetchall() == styled.execute('SELECT * FROM subtrechos ORDER BY fid').fetchall()
    assert styled.execute('SELECT count(*) FROM layer_styles WHERE useAsDefault=1').fetchone()[0] == 1
    assert styled.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
print(json.dumps({'registros':reopened.featureCount(),'estilo_padrao_reaberto':True,'atributos_e_geometrias_identicos':True,'classes':[(label,color) for _,label,color in palette]},ensure_ascii=True))
# Avoid provider shutdown ordering issues on Windows; all files are flushed above.
del reopened, layer
import sys
sys.stdout.flush()
os._exit(0)
