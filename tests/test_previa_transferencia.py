"""Executa o render real com mapa sintético; conta reconstruções geométricas."""
import json
from pathlib import Path
import shutil
import subprocess

import pytest


def test_transferencia_nao_reconstroi_previa_sem_mudanca_geometrica():
    if not shutil.which('node'):
        pytest.skip('Node indisponível')
    source = Path('geoespacial/extracao-atributos/previa.js').read_text(encoding='utf-8')
    script = r"""
const vm=require('node:vm'),fs=require('node:fs');
let source=fs.readFileSync(0,'utf8').replace(/^import .*$/gm,'').replace('export function','function');
source=source.replace('return {render:atualizar};',
  'renderLista=()=>{};renderDetalhes=()=>{};sincronizarVisibilidade=()=>{};return {render:atualizar};');
let geometrias=0,tiles=0;
const bounds={isValid:()=>false};
const layer=()=>({addTo(){return this},once(){return this},on(){return this},
  remove(){},addLayer(){return this},getBounds:()=>bounds,clearLayers(){},addData(){}});
const map={setView(){return this},on(){},getZoom:()=>8,invalidateSize(){}};
const node={querySelectorAll:()=>[],querySelector(){return node},addEventListener(){},
  content:{firstElementChild:{cloneNode(){return node}}}};
const control=()=>({addTo(){}});
control.scale=control;
const context={console,$:()=>node,document:{getElementById:()=>node},
  ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>fn(),
  camadaTiles:()=>{tiles++;return layer()},window:{L:{map:()=>map,tileLayer:layer,
    control,DomEvent:{disableClickPropagation(){},disableScrollPropagation(){}},
    featureGroup:layer,geoJSON:()=>{geometrias++;return layer()}}}};
vm.createContext(context);
vm.runInContext(source+`
const geojson={type:'FeatureCollection',features:[]};
let camadas=[{chave:'entrada:a',status_validacao:'valida',geojson},
  {chave:'base:b',status_validacao:'valida',tiles_url:'/tiles',revisao:'1'}];
const state={busy:false,previaVisiveis:new Set()};
const preview=criarPrevia(state,()=>{},{obterCamadas:()=>camadas});
preview.render();
state.busy=true;preview.render();
state.busy=false;camadas=camadas.map(c=>({...c,pendente:false}));preview.render();
`,context);
const repetida={geometrias,tiles};
vm.runInContext(`camadas=camadas.map(c=>({...c,revisao:'2'}));preview.render();`,context);
console.log(JSON.stringify({repetida,atualizada:{geometrias,tiles}}));
"""
    result = subprocess.run(['node', '-e', script], input=source, encoding='utf-8',
                            capture_output=True, check=True, timeout=15)
    counters = json.loads(result.stdout)
    assert counters['repetida'] == {'geometrias': 1, 'tiles': 1}, counters
    assert counters['atualizada'] == {'geometrias': 2, 'tiles': 2}, counters
