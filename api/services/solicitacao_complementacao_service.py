"""Criação atômica de solicitações, separada do cadastro da demanda."""
from psycopg import sql
from api.db.connection import atomic_connection
from api.exceptions import DemandaValidationError
from api.repositories import solicitacao_complementacao_repository as repo, hierarquizacao_repository

TIPOS = {'dados_cadastrais', 'geometria', 'atributos_objeto'}

def bloquear(conn, tipo, codigo):
    if tipo not in {'projeto','programa','plano'}:
        raise DemandaValidationError('Tipo de demanda inválido.', field='tipo')
    return conn.execute(sql.SQL('SELECT codigo,status FROM demandas.{} WHERE codigo=%s FOR UPDATE').format(
        sql.Identifier(tipo)), (codigo,)).fetchone()

def solicitar(codigo, *, categorias, descricao, user, hierarquizacao_codigo=None):
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
    tipo, demanda = analise._localizar_demanda(codigo)
    with atomic_connection() as conn:
        row = bloquear(conn, tipo, codigo)
        if not row:
            raise DemandaValidationError('Demanda não encontrada.', field='codigo')
        if any(s.get('hierarquizacao_codigo') == hierarquizacao_codigo for s in repo.listar(tipo=tipo,codigo=codigo)):
            raise DemandaValidationError('Já existe uma solicitação aberta para esta demanda e contexto.', field='codigo')
        if hierarquizacao_codigo:
            h = hierarquizacao_repository.get_by_codigo(hierarquizacao_codigo)
            objetos = ((h or {}).get('dados_hierarquizacao') or {}).get('objetos', [])
            if not any(o.get('cabecalho_objeto',{}).get('codigo') == codigo and
                       o.get('cabecalho_objeto',{}).get('tipo_demanda') == tipo for o in objetos):
                raise DemandaValidationError('A demanda não pertence à hierarquização informada.', field='hierarquizacao_codigo')
        else:
            if row['status'] != 'analise_em_avaliacao':
                raise DemandaValidationError('A demanda deve estar em avaliação para solicitar cadastro ou geometria.', field='status')
        pedido = repo.criar(tipo,codigo,categorias,descricao.strip(),user,hierarquizacao_codigo)
        if not hierarquizacao_codigo:
            analise._aplicar_transicao(tipo=tipo,codigo=codigo,status_atual=row['status'],
                destino='analise_aguardando_complementacao',avaliador_id=user.id)
        return pedido


def validar_mudanca_status(tipo, codigo, de, para):
    if de == para:
        return
    if 'analise_aguardando_complementacao' not in (de, para):
        return
    abertas = [s for s in repo.listar(tipo=tipo, codigo=codigo) if not s.get('hierarquizacao_codigo')]
    if para == 'analise_aguardando_complementacao' and not abertas:
        raise DemandaValidationError('Use Solicitar complementação e informe o tipo e o motivo.', field='status')
    if de == 'analise_aguardando_complementacao' and abertas:
        raise DemandaValidationError('Conclua a solicitação antes de alterar o status da demanda.', field='status')
