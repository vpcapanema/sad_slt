"""Instrumentação observada, sem alterar algoritmos ou inventar percentuais."""
from contextlib import contextmanager
from time import monotonic


@contextmanager
def operacao(progress, mensagem):
    """Anuncia antes do trabalho e conclui só no retorno normal do bloco."""
    iniciar = getattr(progress, 'iniciar_operacao', progress)
    ident = iniciar(mensagem) if progress else None
    ultimo = 0.0

    def medir(feitas, total, unidade="itens", detalhe=None, forcar=False):
        nonlocal ultimo
        if not progress:
            return
        # Cancelamento é consultado a cada checkpoint, mesmo sem publicar.
        verificar = getattr(progress, 'verificar', None)
        if verificar:
            verificar()
        agora = monotonic()
        if not forcar and feitas not in (0, total) and agora - ultimo < .25:
            return
        ultimo = agora
        if hasattr(progress, 'medir_operacao'):
            progress.medir_operacao(ident, feitas, total, unidade)
        elif hasattr(progress, 'tarefa'):
            progress.tarefa(feitas, total, unidade)
        texto = detalhe or f'{mensagem}: {feitas}/{total} {unidade}.'
        getattr(progress, 'detalhe', progress)(texto)

    try:
        yield medir
    except BaseException as exc:
        if progress and hasattr(progress, 'falhar'):
            progress.falhar(ident, exc)
        raise
    else:
        if progress and hasattr(progress, 'concluir'):
            progress.concluir(ident, mensagem)


def contexto(progress, nome):
    """Propaga capacidades e acrescenta contexto a toda mensagem da operação."""
    if not progress:
        return None
    def emitir(mensagem):
        return progress(f'{nome} — {mensagem}')
    emitir.detalhe = lambda mensagem: getattr(progress, 'detalhe', progress)(f'{nome} — {mensagem}')
    if hasattr(progress, 'iniciar_operacao'):
        emitir.iniciar_operacao = lambda mensagem: progress.iniciar_operacao(f'{nome} — {mensagem}')
    if hasattr(progress, 'concluir'):
        emitir.concluir = lambda ident=None, mensagem=None: progress.concluir(ident, f'{nome} — {mensagem}' if mensagem else None)
    for chave in ('tarefa', 'verificar', 'progresso_fase', 'fase', 'medir_operacao', 'falhar', 'concluir_fase'):
        if hasattr(progress, chave):
            setattr(emitir, chave, getattr(progress, chave))
    return emitir
