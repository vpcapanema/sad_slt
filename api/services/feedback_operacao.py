"""Instrumentação observada, sem alterar algoritmos ou inventar percentuais."""
from contextlib import contextmanager
from time import monotonic


def capacidade(progress, nome, padrao=None):
    """Adapta callbacks legados ligados a um ControleProcessamento."""
    owner = getattr(progress, "__self__", None) or getattr(getattr(progress, "concluir", None), "__self__", None)
    return getattr(progress, nome, getattr(owner, nome, padrao))


@contextmanager
def operacao(progress, mensagem):
    """Anuncia antes do trabalho e conclui só no retorno normal do bloco."""
    iniciar = capacidade(progress, 'iniciar_operacao', progress)
    ident = iniciar(mensagem) if progress else None
    ultimo = 0.0

    def medir(feitas, total, unidade="itens", detalhe=None, forcar=False):
        nonlocal ultimo
        if not progress:
            return
        # Cancelamento é consultado a cada checkpoint, mesmo sem publicar.
        verificar = capacidade(progress, 'verificar')
        if verificar:
            verificar()
        agora = monotonic()
        if not forcar and feitas not in (0, total) and agora - ultimo < .25:
            return
        ultimo = agora
        medir_op = capacidade(progress, 'medir_operacao')
        if medir_op:
            medir_op(ident, feitas, total, unidade)
        elif capacidade(progress, 'tarefa'):
            capacidade(progress, 'tarefa')(feitas, total, unidade)
        texto = detalhe or f'{mensagem}: {feitas}/{total} {unidade}.'
        capacidade(progress, 'detalhe', progress)(texto)

    try:
        yield medir
    except BaseException as exc:
        if progress and capacidade(progress, 'falhar'):
            capacidade(progress, 'falhar')(ident, exc)
        raise
    else:
        if progress and capacidade(progress, 'concluir'):
            capacidade(progress, 'concluir')(ident, mensagem)


def contexto(progress, nome):
    """Propaga capacidades e acrescenta contexto a toda mensagem da operação."""
    if not progress:
        return None
    def emitir(mensagem):
        return progress(f'{nome} — {mensagem}')
    emitir.detalhe = lambda mensagem: capacidade(progress, 'detalhe', progress)(f'{nome} — {mensagem}')
    if capacidade(progress, 'iniciar_operacao'):
        emitir.iniciar_operacao = lambda mensagem: capacidade(progress, 'iniciar_operacao')(f'{nome} — {mensagem}')
    if capacidade(progress, 'concluir'):
        emitir.concluir = lambda ident=None, mensagem=None: capacidade(progress, 'concluir')(ident, f'{nome} — {mensagem}' if mensagem else None)
    for chave in ('tarefa', 'verificar', 'progresso_fase', 'fase', 'medir_operacao', 'falhar', 'concluir_fase'):
        if capacidade(progress, chave):
            setattr(emitir, chave, capacidade(progress, chave))
    return emitir
