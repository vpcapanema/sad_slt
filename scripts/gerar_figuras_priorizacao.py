"""Regenera figuras didáticas com os mesmos valores usados na documentação."""
from pathlib import Path
import sys

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))
from api.services.documentacao_priorizacao import montar_contexto

SAIDA = RAIZ / 'assets/images/documentacao/priorizacao-atributos'
AZUL, VERDE, CINZA = '#003b5a', '#3ec26e', '#5a6570'
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 11, 'axes.labelcolor': AZUL,
                     'text.color': AZUL, 'axes.spines.top': False, 'axes.spines.right': False,
                     'svg.hashsalt': 'sicard-priorizacao-atributos'})


def salvar(fig, nome):
    SAIDA.mkdir(parents=True, exist_ok=True)
    svg = SAIDA / f'{nome}.svg'
    fig.savefig(svg, bbox_inches='tight', facecolor='white', metadata={'Date': None})
    svg.write_text('\n'.join(linha.rstrip() for linha in svg.read_text(encoding='utf-8').splitlines()) + '\n',
                   encoding='utf-8')
    fig.savefig(SAIDA / f'{nome}.png', bbox_inches='tight', dpi=180, facecolor='white')
    plt.close(fig)


def gerar():
    dados = montar_contexto()['exemplos']
    fig, ax = plt.subplots(figsize=(12, 4.8))
    ax.set(xlim=(0, 12), ylim=(0, 4.8)); ax.axis('off')
    etapas = [('Rodada e atributos', 'Origem, escala e completude'), ('Escalas e pesos', 'Normalização e ponderação'),
              ('Prévia da prioridade', 'Conferência sem gravação'), ('Resultado da Fase 3', 'Salvamento explícito'),
              ('Síntese e ranking', 'Combinação dos três índices'), ('Homologação', 'Formalização do resultado')]
    pontos = [(0.2, 3.2), (4.2, 3.2), (8.2, 3.2), (8.2, .9), (4.2, .9), (.2, .9)]
    for i, ((titulo, subtitulo), (x, y)) in enumerate(zip(etapas, pontos), 1):
        ax.add_patch(FancyBboxPatch((x, y), 3.5, 1.2, boxstyle='round,pad=.08', facecolor='#eaf1f5', edgecolor=AZUL))
        ax.text(x + .2, y + .9, f'{i}. {titulo}', weight='bold', fontsize=11)
        ax.text(x + .2, y + .4, subtitulo, color=CINZA, fontsize=9.5)
    for a, b in [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5)]:
        x, y = pontos[a]; u, v = pontos[b]
        inicio, fim = ((x + 3.6, y + .6), (u - .1, v + .6)) if y == v and u > x else (
            ((x - .1, y + .6), (u + 3.6, v + .6)) if y == v else ((x + 1.75, y - .1), (u + 1.75, v + 1.3)))
        ax.annotate('', xy=fim, xytext=inicio, arrowprops={'arrowstyle': '->', 'color': AZUL, 'lw': 2})
    ax.text(.2, .18, 'Fluxo explicativo da interface. Calcular, salvar e homologar são operações distintas.', color=CINZA, fontsize=10)
    salvar(fig, 'fluxo')

    fig, ax = plt.subplots(figsize=(11, 4.6))
    bases = [0.] * 3
    for j, (rotulo, cor) in enumerate([('Prazo · peso 0,40', AZUL), ('Atendimento · peso 0,30', '#116593'), ('Maturidade · peso 0,30', VERDE)]):
        valores = [d['contribuicoes'][j] for d in dados]
        ax.barh([d['nome'] for d in dados], valores, left=bases, color=cor, label=rotulo)
        bases = [a + b for a, b in zip(bases, valores)]
    for i, d in enumerate(dados): ax.text(d['prioridade'] + .02, i, f"{d['prioridade']:.2f}".replace('.', ','), va='center', weight='bold')
    ax.set(xlim=(0, 1), xlabel='Índice de prioridade · soma das contribuições', title='Exemplo hipotético: atributos normalizados e pesos abrangentes')
    ax.invert_yaxis(); ax.legend(loc='lower right', frameon=False, fontsize=9)
    ax.grid(axis='x', alpha=.15); ax.set_axisbelow(True)
    salvar(fig, 'contribuicoes')

    fig, ax = plt.subplots(figsize=(11, 4.6))
    for deslocamento, campo, cor, rotulo in [(-.18, 'simples', AZUL, 'Média simples'), (.18, 'ponderada', VERDE, 'Pesos: rede 0,50 · território 0,20 · prioridade 0,30')]:
        bars = ax.bar([i + deslocamento for i in range(3)], [d[campo] for d in dados], width=.34, color=cor, label=rotulo)
        ax.bar_label(bars, labels=[f"{d[campo]:.3f}".replace('.', ',') for d in dados], padding=4, fontsize=10)
    ax.set(xticks=range(3), xticklabels=[d['nome'] for d in dados], ylim=(0, 1), ylabel='Índice geral', title='Exemplo hipotético: a escolha dos pesos altera a ordenação final')
    ax.legend(loc='upper center', frameon=False, fontsize=9); ax.grid(axis='y', alpha=.15); ax.set_axisbelow(True)
    salvar(fig, 'sintese')
    print('Geradas três figuras didáticas em SVG e PNG.')


if __name__ == '__main__':
    gerar()
