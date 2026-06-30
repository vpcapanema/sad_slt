---
applyTo: "assets/js/status-colors.js,assets/css/app.css,admin/**/*.js,admin/**/*.html,painel/**/*"
description: "Paleta e uso sistemico das cores de status de demanda no SLT"
---

# Cores de status (SLT)

## Fonte unica

Todas as cores de status vivem em assets/js/status-colors.js:

- bg: badge e fundo claro
- text: texto do badge e contorno no mapa
- row: tint das linhas da tabela admin e preenchimento liso (projeto)
- halo: halo animado no mapa

Nao defina cores por status em app.css, HTML ou JS avulso.

## Fases (legenda)

Tres fases na legenda (LEGEND_FASES):

1. Fase 1 - Analise
2. Fase 2 - Hierarquizacao
3. Fase 3 - Ranqueamento e execucao

## Texturas por tipo de demanda (mapa)

Textura no preenchimento de poligonos, nao por fase:

- Plano: poligono com listras diagonais
- Programa: poligono com malha cruzada
- Projeto: alfinete liso (sem textura)

Use SLTStatusColors.leafletPathStyle(codigo, kind, tipoDemanda) nos mapas.
Padroes SVG em #slt-map-patterns via registerPattern().

## Injecao automatica

SLTStatusColors.injectTheme() gera variaveis CSS (--status-{codigo}-*) e estilos de badge/linha.

## Legendas

Use SLTStatusColors.renderLegend(container, { labelFn, tipoDemanda?, tipoLegend? }):

- Paineis (tipos mistos): swatches de status solidos + bloco Tipo de demanda
- admin/demandas: passe tipoDemanda: tipo para swatches com textura do tipo filtrado

## Novo status

1. Adicionar em database/*_dom_status_demanda*.sql
2. Entrada em STATUS_DEMANDA + LEGEND_ORDER em status-colors.js
3. Se tipado, STATUS_ROTULOS_POR_TIPO em api/constants.py
