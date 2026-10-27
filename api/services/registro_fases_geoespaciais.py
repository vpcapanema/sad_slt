"""Confirmação explícita de saídas já processadas, sem executar geoprocessamento."""
from hashlib import sha256
import json

from api.db.connection import atomic_connection
from api.services import elegibilidade_relatorio as relatorios, hierarquizacao_service as hier


def _versao(row):
    return sha256(json.dumps(row, sort_keys=True, default=str, ensure_ascii=False).encode()).hexdigest()


def registrar(identificadores, dono, *, analise, nomes, revisados, versao=None, agregacao=None):
    if not revisados:
        raise ValueError('Confira os nomes e os resultados antes de registrar a fase.')
    fase = 1 if analise == 'elegibilidade' else 2
    resultados = relatorios._selecionar(identificadores, dono, analise=analise)
    codigos = {r[analise].get('hierarquizacao') for r in resultados}
    if len(codigos) != 1 or not next(iter(codigos)):
        raise ValueError('Selecione uma execução vinculada a uma única hierarquização.')
    if len(resultados) != resultados[0].get('total_entradas', 1):
        raise ValueError('Conclua todas as entradas do lote antes de registrar a fase.')
    codigo = next(iter(codigos))
    # A leitura verifica a assinatura e o conteúdo da saída persistida.
    linhas = [linha for r in resultados for linha in relatorios.resumo_por_demanda(r, dono, analise=analise)]
    configuracao = None
    if fase == 2:
        from api.services import agregacao_favorabilidade
        configuracao = agregacao_favorabilidade.carregar(resultados, dono)
        if not configuracao or configuracao != agregacao:
            raise ValueError('Escolha e salve a medida de agregação antes de registrar os resultados da fase 2.')
        for linha in linhas:
            agregacao_favorabilidade.valores_linha(linha, configuracao)
    assinatura = sha256(json.dumps({'saidas': sorted((r['arquivo'], r['sha256']) for r in resultados),
                                    'nomes': nomes, 'agregacao': configuracao}, sort_keys=True).encode()).hexdigest()
    coluna = f'relatorio_fase{fase}'
    with atomic_connection():
        row = hier.repo.get_by_codigo(codigo, for_update=True)
        if not row:
            raise ValueError('Hierarquização não encontrada.')
        if row.get('status') in hier.STATUS_SEM_ALTERACAO:
            raise ValueError('Não é permitido registrar resultados em uma hierarquização homologada ou arquivada.')
        dados = row.get('dados_hierarquizacao') or {}
        if fase not in hier._fases_configuradas(dados):
            raise ValueError('Esta fase não faz parte da hierarquização.')
        esperados = {str(o['cabecalho_objeto']['codigo']) for o in dados.get('objetos', [])}
        recebidos = [str(l.get('codigo_demanda')) for l in linhas]
        if not esperados or set(recebidos) != esperados or len(recebidos) != len(esperados):
            raise ValueError('A saída deve conter exatamente todas as demandas atuais da hierarquização, sem repetições.')
        registro = row.get(coluna) or {}
        if registro.get('registro_explicito', {}).get('assinatura') == assinatura:
            return {'registrado': True, 'ja_registrado': True, 'hierarquizacao': codigo}
        if versao is None:
            return {'registrado': False, 'versao': _versao(row), 'hierarquizacao': codigo, 'demandas': len(linhas)}
        if versao != _versao(row):
            raise ValueError('A hierarquização foi alterada. Confira novamente os resultados e repita o registro.')
        modelo, _ = relatorios.montar(identificadores, nomes, dono, revisados, analise=analise)
        relatorios.registrar_relatorios(identificadores, modelo, dono, analise=analise)
        documento = next((d for d in modelo.get('relatorios_hierarquizacao', [])
                          if d['hierarquizacao'] == codigo), None)
        for resultado in resultados:
            opcoes = {'agregacao': configuracao} if fase == 2 else {}
            resposta = hier.registrar_resultado_por_demanda(codigo, fase, resultado, dono, **opcoes)
            if not resposta.get('registrado'):
                raise ValueError(resposta['motivo'])
            hier.registrar_saida_geoespacial(codigo, fase, resultado, dono, documento)
        hier.atualizar_nomes_resultado(codigo, fase, nomes)
        registro = hier.repo.get_by_codigo(codigo).get(coluna) or {}
        registro['registro_explicito'] = {'assinatura': assinatura, 'execucoes': identificadores,
                                         'registrado_por': str(dono), 'agregacao': configuracao}
        hier.repo.update(codigo, {coluna: registro})
    return {'registrado': True, 'hierarquizacao': codigo, 'demandas': len(linhas)}
