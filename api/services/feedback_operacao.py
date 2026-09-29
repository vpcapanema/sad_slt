"""Instrumentação observada, sem alterar algoritmos ou inventar percentuais."""
from contextlib import contextmanager
from time import monotonic


@contextmanager
def operacao(progress, mensagem):
    """Anuncia antes do trabalho e conclui só no retorno normal do bloco."""
    ident = progress(mensagem) if progress else None
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
        if hasattr(progress, 'tarefa'):
            progress.tarefa(feitas, total, unidade)
        texto = detalhe or f'{mensagem}: {feitas}/{total} {unidade}.'
        getattr(progress, 'detalhe', progress)(texto)

    yield medir
    if progress and hasattr(progress, 'concluir'):
        progress.concluir(ident, mensagem)


def contexto(progress, nome):
    """Propaga capacidades e acrescenta contexto a toda mensagem da operação."""
    if not progress:
        return None
    def emitir(mensagem):
        return progress(f'{nome} — {mensagem}')
    emitir.detalhe = lambda mensagem: getattr(progress, 'detalhe', progress)(f'{nome} — {mensagem}')
    if hasattr(progress, 'concluir'):
        emitir.concluir = lambda ident=None, mensagem=None: progress.concluir(ident, f'{nome} — {mensagem}' if mensagem else None)
    for chave in ('tarefa', 'verificar', 'progresso_fase', 'fase'):
        if hasattr(progress, chave):
            setattr(emitir, chave, getattr(progress, chave))
    return emitir
