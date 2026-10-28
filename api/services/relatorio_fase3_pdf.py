"""Relatório da Fase 3 a partir dos resultados persistidos, sem novo cálculo."""
from io import BytesIO
import math
from datetime import datetime, timezone

from reportlab.lib.enums import TA_JUSTIFY
from reportlab.platypus import Spacer

from api.services import extracao_atributos_relatorios as estilo
from api.services.relatorio_fases_pdf import _hero, _campos, _organizar_topicos


TITULO = ('Relatório de Priorização por Atributos para Implantação/Execução '
          'de Demandas de Logística e Transportes')
REGRAS = {
    'renormalizar': 'Ignorar valores ausentes e redistribuir os pesos entre os disponíveis',
    'bloquear': 'Bloquear demandas com atributos ausentes',
    'imputar_neutro': 'Substituir valores ausentes por valor neutro',
    'imputar_pior': 'Substituir valores ausentes pelo pior valor',
    'imputar_medio': 'Substituir valores ausentes pela média',
}


def _numero(valor, *, percentual=False):
    if valor is None:
        return 'Não registrado'
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        raise ValueError('O resultado da Fase 3 contém um valor numérico inválido.')
    return estilo.numero(valor * 100 if percentual else valor, 2 if percentual else 4) + ('%' if percentual else '')


def documento(registro):
    dados = registro.get('dados_hierarquizacao') or {}
    cab = dados.get('cabecalho_grupo') or {}
    relatorios = cab.get('relatorios') or {}
    execucao = relatorios.get('fase_3') or {}
    config = (cab.get('configuracoes') or {}).get('fase_3') or {}
    objetos = dados.get('objetos') or []
    if (not objetos or not execucao.get('executada_em')
            or execucao.get('desatualizado')
            or (registro.get('relatorio_fase3') or {}).get('desatualizado')):
        raise ValueError('Execute a Fase 3 com os dados atuais antes de emitir o relatório.')
    for objeto in objetos:
        fase = (objeto.get('hierarquizacao') or {}).get('fase_3') or {}
        complemento = (objeto.get('cabecalho_objeto') or {}).get('complementacao_atributos') or {}
        if not fase.get('executada') or fase.get('desatualizado') or complemento.get('concluida') is False:
            raise ValueError('Há demandas sem cálculo atual ou com complementação pendente. Recalcule a Fase 3.')
    criterios = config.get('criterios') or []
    if not criterios:
        raise ValueError('Os critérios da execução da Fase 3 não estão registrados.')
    e = estilo._estilos()
    for chave in ('corpo', 'nota', 'item'):
        e[chave].alignment = TA_JUSTIFY
    for chave in ('h1', 'h2'):
        e[chave].keepWithNext = True
    fonte = {'ahp': 'AHP colaborativa', 'manual': 'Preenchimento manual'}.get(config.get('fonte_pesos'), 'Não registrada')
    regra = execucao.get('regra_ausentes', config.get('regra_ausentes'))
    completude = execucao.get('completude_minima', config.get('completude_minima'))
    historia = [
        _hero(e), Spacer(1, 12), estilo._p(e, TITULO, 'h1'),
        estilo._p(e, 'Fase 3 — Priorização de demandas por atributos', 'h2'),
        estilo._p(e, '1 — Identificação e alcance da análise', 'h1'),
        _campos(e, [
            ('Emitido em', estilo.hora(datetime.now(timezone.utc).isoformat())),
            ('Hierarquização', registro.get('codigo') or cab.get('codigo')),
            ('Rodada', registro.get('nome') or cab.get('nome')),
            ('Objetivo:', 'Apresentar a prioridade relativa das demandas segundo seus atributos e os critérios da rodada.'),
            ('Pergunta da fase:', 'Quais demandas apresentam maior índice de prioridade segundo os atributos avaliados?'),
            ('Calculado em', estilo.hora(execucao['executada_em'])),
            ('Demandas avaliadas', len(objetos)),
            ('Fonte dos pesos', fonte),
            ('Ponderação', config.get('ponderacao') or 'Não registrada'),
            ('Tratamento dos ausentes', REGRAS.get(regra, regra or 'Não registrado')),
            ('Completude mínima', _numero(completude, percentual=True)),
        ]),
        estilo._p(e, '2 — Resultados por demanda', 'h1'),
        estilo._p(e, 'O índice de prioridade é o resultado principal da Fase 3. '
                      'O ranking desta fase não substitui a síntese final nem a homologação.'),
    ]
    linhas = [['Posição', 'Demanda', 'Índice de prioridade', 'Completude', 'Situação']]
    pendencias = []
    detalhes = []
    for objeto in objetos:
        identificacao = objeto.get('cabecalho_objeto') or {}
        nome = identificacao.get('nome') or identificacao.get('codigo') or 'Nome não informado'
        codigo = identificacao.get('codigo') or identificacao.get('demanda_id') or 'Identificador não registrado'
        fase = objeto['hierarquizacao']['fase_3']
        indice = fase.get('score_fase3')
        motivos = []
        if fase.get('bloqueada_por_risco'):
            motivos.append('Bloqueada pela análise de risco')
        if fase.get('bloqueada_por_atributo_obrigatorio'):
            motivos.append('Atributo obrigatório ausente ou inválido')
        if fase.get('atributos_ausentes'):
            motivos.append('Atributos ausentes: ' + '; '.join(fase['atributos_ausentes']))
        if fase.get('atributos_invalidos'):
            motivos.append('Atributos inválidos: ' + '; '.join(fase['atributos_invalidos']))
        grau = fase.get('grau_completude_fase3')
        if grau is not None and completude is not None and grau < completude:
            motivos.append('Completude abaixo do mínimo exigido')
        if indice is None and not motivos:
            motivos.append('Motivo da ausência de índice não registrado')
        linhas.append([fase.get('ranking_fase3') if indice is not None else '—',
                       f'{nome} ({codigo})', _numero(indice) if indice is not None else 'Sem índice',
                       _numero(grau, percentual=True), 'Calculado' if indice is not None else 'Sem índice'])
        if motivos:
            pendencias.append(f'{nome} ({codigo}): ' + '. '.join(motivos) + '.')
        for criterio, contribuicao in (fase.get('contribuicao_por_criterio') or {}).items():
            detalhes.append([f'{nome} ({codigo})', criterio, _numero(contribuicao)])
    historia += [
        estilo._tabela(e, linhas, [35, estilo.LARGURA - 205, 65, 50, 55]),
        estilo._p(e, 'Pendências e demandas sem índice', 'h2'),
        *[estilo._p(e, texto) for texto in (pendencias or ['Todas as demandas avaliadas receberam um índice, sem pendências registradas.'])],
        estilo._p(e, '3 — Como ler os resultados', 'h1'),
        estilo._p(e, 'Valores maiores indicam maior prioridade relativa segundo os critérios e pesos utilizados. '
                      'Zero calculado é diferente de ausência de índice. A completude indica a disponibilidade de atributos. '
                      'Valores imputados, quando previstos na política escolhida, não equivalem a observações coletadas.'),
        estilo._p(e, '4 — Critérios, pesos e contribuições utilizados', 'h1'),
    ]
    tabela_criterios = [['Critério / atributo', 'Grupo', 'Peso configurado', 'Regra / unidade']]
    for criterio in criterios:
        tabela_criterios.append([
            criterio.get('criterio') or criterio.get('nome_coluna') or 'Não registrado',
            criterio.get('grupo_atributo') or 'Não registrado', _numero(criterio.get('peso')),
            ' / '.join(str(criterio[c]) for c in ('tipo_dado', 'direcao', 'unidade') if criterio.get(c)) or 'Não registrada',
        ])
    historia.append(estilo._tabela(e, tabela_criterios, [estilo.LARGURA * p for p in (.38, .2, .16, .26)]))
    for objeto in objetos:
        nome = (objeto.get('cabecalho_objeto') or {}).get('nome') or 'Nome não informado'
        fase = objeto['hierarquizacao']['fase_3']
        historia.append(estilo._p(e, f'Pesos efetivamente utilizados — {nome}', 'h2'))
        pesos = fase.get('pesos_fase3') or {}
        historia.extend(estilo._p(e, f'{criterio}: {_numero(peso)}.') for criterio, peso in pesos.items())
        if not pesos:
            historia.append(estilo._p(e, 'Pesos efetivamente utilizados não registrados nesta saída.'))
        historia.append(estilo._p(e, 'Índice antes do risco: ' + _numero(fase.get('score_fase3_antes_risco')) +
                                    '. Fator de penalização por risco: ' + _numero(fase.get('fator_penalizacao_risco')) + '.'))
    if detalhes:
        historia += [estilo._p(e, 'Contribuições aplicadas por demanda e critério', 'h2'),
                     estilo._tabela(e, [['Demanda', 'Critério', 'Contribuição'], *detalhes],
                                    [estilo.LARGURA * p for p in (.4, .4, .2)])]
    historia += [
        estilo._p(e, '5 — Metodologia e limites', 'h1'),
        estilo._p(e, 'A emissão utiliza os índices, posições, pesos e contribuições persistidos; não recalcula resultados. '
                      'A Fase 3 pondera atributos próprios das demandas e aplica o tratamento de ausências e risco registrado na execução. '
                      'Não são criadas superfícies territoriais nesta fase. Os mapas e bases espaciais são documentados nos relatórios das Fases 1 e 2. '
                      'A prioridade relativa não comprova viabilidade nem constitui autorização de implantação/execução.'),
        estilo._p(e, '6 — Rastreabilidade e próximos passos', 'h1'),
        estilo._p(e, 'Confira os critérios, os pesos, as pendências e a data de cálculo antes de utilizar o ranking. '
                      'A emissão não altera o cadastro, os índices, a síntese ou a homologação. '
                      'Após alteração de atributos ou critérios, recalcule a fase antes de emitir novo relatório.'),
    ]
    buffer = BytesIO()
    estilo._construir(buffer, 'Priorização por Atributos — Fase 3', _organizar_topicos(historia, e))
    return buffer.getvalue()
