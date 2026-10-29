"""Criação atômica de solicitações, separada do cadastro da demanda."""
from psycopg import sql
from api.db.connection import atomic_connection
from api.exceptions import DemandaValidationError
from api.repositories import solicitacao_complementacao_repository as repo, hierarquizacao_repository
from api.constants import STATUS_EM_HIERARQUIZACAO, STATUS_HIERARQUIZACAO_COMPLEMENTACAO

TIPOS = {'dados_cadastrais', 'geometria', 'atributos_objeto'}

def bloquear(conn, tipo, codigo):
    if tipo not in {'projeto','programa','plano'}:
        raise DemandaValidationError('Tipo de demanda inválido.', field='tipo')
    return conn.execute(sql.SQL('SELECT * FROM demandas.{} WHERE codigo=%s FOR UPDATE').format(
        sql.Identifier(tipo)), (codigo,)).fetchone()

def solicitar(codigo, *, categorias, descricao, user, hierarquizacao_codigo=None, demanda_tipo=None):
    from api.services import analise_demanda_service as analise
    categorias = list(dict.fromkeys(categorias or []))
    if not categorias or not set(categorias) <= TIPOS:
        raise DemandaValidationError('Selecione os tipos de complementação.', field='categorias')
    if not descricao or not descricao.strip():
        raise DemandaValidationError('Informe o motivo da solicitação.', field='descricao')
    if ('atributos_objeto' in categorias) != bool(hierarquizacao_codigo):
        raise DemandaValidationError('Informe a hierarquização somente para atributos de objeto.', field='hierarquizacao_codigo')
    # Atributos têm ciclo próprio e não interrompem a análise cadastral.
    if 'atributos_objeto' in categorias and len(categorias) != 1:
        raise DemandaValidationError('Solicite atributos de objeto separadamente do cadastro e geometria.', field='categorias')
    if demanda_tipo is None:
        tipo, _ = analise._localizar_demanda(codigo)
    else:
        tipo = demanda_tipo
    with atomic_connection() as conn:
        h = hierarquizacao_repository.get_by_codigo(hierarquizacao_codigo, for_update=True) if hierarquizacao_codigo else None
        row = bloquear(conn, tipo, codigo)
        if not row:
            raise DemandaValidationError('Demanda não encontrada.', field='codigo')
        if any(s.get('hierarquizacao_codigo') == hierarquizacao_codigo for s in repo.listar(tipo=tipo,codigo=codigo)):
            raise DemandaValidationError('Já existe uma solicitação aberta para esta demanda e contexto.', field='codigo')
        if hierarquizacao_codigo:
            if not h or h.get("status") in {"arquivada", "homologada"}:
                raise DemandaValidationError('A hierarquização não está aberta para complementação.', field='hierarquizacao_codigo')
            objetos = ((h or {}).get('dados_hierarquizacao') or {}).get('objetos', [])
            if not any(o.get('cabecalho_objeto',{}).get('codigo') == codigo and
                       o.get('cabecalho_objeto',{}).get('tipo_demanda') == tipo for o in objetos):
                raise DemandaValidationError('A demanda não pertence à hierarquização informada.', field='hierarquizacao_codigo')
            if row['status'] not in {STATUS_EM_HIERARQUIZACAO, STATUS_HIERARQUIZACAO_COMPLEMENTACAO}:
                raise DemandaValidationError('A demanda deve estar em hierarquização para complementar atributos.', field='status')
        else:
            if row['status'] not in {'analise_em_avaliacao', 'analise_aguardando_complementacao'}:
                raise DemandaValidationError('A demanda deve estar em avaliação para solicitar cadastro ou geometria.', field='status')
        pedido = repo.criar(tipo,codigo,categorias,descricao.strip(),user,hierarquizacao_codigo)
        if not hierarquizacao_codigo and row['status'] == 'analise_em_avaliacao':
            analise._aplicar_transicao(tipo=tipo,codigo=codigo,status_atual=row['status'],
                destino='analise_aguardando_complementacao',avaliador_id=user.id)
        elif hierarquizacao_codigo:
            conn.execute(sql.SQL("UPDATE demandas.{} SET status=%s, atualizado_por=%s WHERE codigo=%s").format(
                sql.Identifier(tipo)), (STATUS_HIERARQUIZACAO_COMPLEMENTACAO, user.id, codigo))
        return pedido


def validar_mudanca_status(tipo, codigo, de, para):
    if de == para:
        return
    if STATUS_HIERARQUIZACAO_COMPLEMENTACAO in (de, para):
        raise DemandaValidationError('Use o fluxo de complementação de atributos da hierarquização para alterar este status.', field='status')
    if 'analise_aguardando_complementacao' not in (de, para):
        return
    abertas = [s for s in repo.listar(tipo=tipo, codigo=codigo) if not s.get('hierarquizacao_codigo')]
    if para == 'analise_aguardando_complementacao' and not abertas:
        raise DemandaValidationError('Use Solicitar complementação e informe o tipo e o motivo.', field='status')
    if de == 'analise_aguardando_complementacao' and abertas:
        raise DemandaValidationError('Conclua a solicitação antes de alterar o status da demanda.', field='status')
