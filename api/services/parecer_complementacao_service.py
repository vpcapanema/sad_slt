"""Reemissão auditada de pareceres de pendências cadastrais abertas."""
from datetime import datetime, timezone
from hashlib import sha256
import json
from zoneinfo import ZoneInfo

from psycopg.types.json import Jsonb

from api.db.connection import atomic_connection, get_connection
from api.exceptions import DemandaValidationError
from api.repositories import analise_demanda_repository as analises
from api.repositories import solicitacao_complementacao_repository as pedidos
from api.services import analise_demanda_service as analise_service
from api.services.solicitacao_complementacao_service import bloquear

TABLE = "demandas.parecer_complementacao_versao"
MODELO_PARECER = analise_service.MODELO_PARECER_PDF


def _fonte(pedido, cadastro, analise):
    return {
        "modelo": MODELO_PARECER,
        "cores_status": analise_service._cores_status_parecer(cadastro["status"]),
        "criterios": list(analise_service.CRITERIOS),
        "respostas": analise_service._respostas(analise),
        "geometria": analise.get("avaliacao_geometria"),
        "complemento": analise.get("parecer_complemento"),
        "duplicada": analise.get("demanda_duplicada_codigo"),
        "avaliador": analise_service._nome_analista(analise),
        "avaliador_id": str(analise["avaliador_id"]) if analise.get("avaliador_id") else None,
        "analise_realizada_em": analise_service._iso(analise.get("analise_realizada_em")),
        "local_analise": analise_service.LOCAL_ANALISE,
        "solicitacao_complementacao": pedido.get("descricao"),
        "demanda": {k: cadastro.get(k) for k in ("codigo", "nome", "status")},
        "tipo": pedido["demanda_tipo"], "categorias": pedido["categorias"],
    }


def _hash(value):
    return sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, default=str).encode("utf-8")).hexdigest()


def _ultima(conn, id):
    return conn.execute(f"SELECT id,numero,origem,fonte_sha256,pdf_sha256,revisado_por,revisado_em "
                        f"FROM {TABLE} WHERE solicitacao_id=%s ORDER BY numero DESC LIMIT 1", (id,)).fetchone()


def _validar_pedido(pedido):
    if pedido["status"] != "registrada" or "atributos_objeto" in pedido["categorias"]:
        raise DemandaValidationError("A atualização exige uma pendência cadastral ou de geometria aberta.", field="solicitacao")
    if (pedido.get("notificacao") or {}).get("status") in {"aceito_smtp", "enviando", "indeterminado"}:
        raise DemandaValidationError("Há envio registrado. O parecer dessa notificação não pode ser substituído.", field="notificacao")


def estado(pedido):
    with get_connection() as conn:
        versao = _ultima(conn, pedido["id"])
        analise = analises.get_by_codigo(pedido["demanda_codigo"])
        tipo, cadastro = analise_service._localizar_demanda(pedido["demanda_codigo"])
        pdf = analises.get_pdf(pedido["demanda_codigo"])
    vigente = bool(versao and analise and tipo == pedido["demanda_tipo"]
                   and versao["origem"] == "analise_vigente"
                   and versao["fonte_sha256"] == _hash(_fonte(pedido, cadastro, analise))
                   and pdf and versao["pdf_sha256"] == sha256(pdf).hexdigest())
    return {"atualizado": vigente, "revisado": bool(vigente and versao["revisado_em"]),
            "numero": versao["numero"] if versao else None,
            "pdf_sha256": versao["pdf_sha256"] if versao else None,
            "versao_id": str(versao["id"]) if versao and versao.get("id") else None,
            "revisado_por": str(versao["revisado_por"]) if versao and versao.get("revisado_por") else None,
            "revisado_em": str(versao["revisado_em"]) if versao and versao.get("revisado_em") else None,
            "fonte_sha256": versao["fonte_sha256"] if versao else None, "modelo": MODELO_PARECER}


def atualizar(pedido, user=None):
    with atomic_connection() as conn:
        pedido = pedidos.obter(pedido["id"], interno=True, lock=True)
        _validar_pedido(pedido)
        cadastro = bloquear(conn, pedido["demanda_tipo"], pedido["demanda_codigo"])
        if not cadastro:
            raise DemandaValidationError("Cadastro da demanda não encontrado.", field="codigo")
        original = conn.execute("SELECT * FROM demandas.analise_demanda WHERE demanda_codigo=%s FOR UPDATE",
                                (pedido["demanda_codigo"],)).fetchone()
        if not original or original["demanda_tipo"] != pedido["demanda_tipo"]:
            raise DemandaValidationError("Registre a análise da demanda antes de atualizar o parecer.", field="analise")
        fonte = _fonte(pedido, cadastro, original)
        assinatura = _hash(fonte)
        ultima = _ultima(conn, pedido["id"])
        pdf_anterior = bytes(original["parecer_pdf"]) if original.get("parecer_pdf") else None
        if (ultima and ultima["origem"] == "analise_vigente" and ultima["fonte_sha256"] == assinatura
                and pdf_anterior and ultima["pdf_sha256"] == sha256(pdf_anterior).hexdigest()):
            return estado(pedido)
        autor = user.id if user else None
        if not ultima:
            legado = {k: v for k, v in original.items() if k != "parecer_pdf"}
            legado = json.loads(json.dumps(legado, default=str))
            conn.execute(f"""INSERT INTO {TABLE}
                (solicitacao_id,numero,origem,fonte_sha256,conteudo,pdf,pdf_sha256,gerado_por)
                VALUES (%s,0,'legado',%s,%s,%s,%s,%s)""",
                (pedido["id"], _hash(legado), Jsonb(legado), pdf_anterior,
                 sha256(pdf_anterior).hexdigest() if pdf_anterior else None, autor))
        momento = datetime.now(timezone.utc)
        momento_local = momento.astimezone(ZoneInfo("America/Sao_Paulo"))
        data_analise = analise_service._momento_analise(original)
        texto = analise_service.gerar_parecer_texto(
            codigo=pedido["demanda_codigo"], nome=cadastro.get("nome") or pedido["demanda_codigo"],
            tipo=pedido["demanda_tipo"], respostas=fonte["respostas"],
            avaliador_nome=fonte["avaliador"], momento=data_analise,
            demanda_duplicada_codigo=original.get("demanda_duplicada_codigo"),
            demanda_duplicada_nome=analise_service._nome_demanda_duplicada(original.get("demanda_duplicada_codigo")))
        if data_analise is None:
            texto = texto.rsplit("\n", 1)[0] + "\nData da análise: não registrada."
        nova = {**original, "parecer_texto": texto,
                "solicitacao_complementacao": pedido.get("descricao")}
        pdf = analise_service.gerar_pdf(demanda=cadastro, tipo=pedido["demanda_tipo"],
            respostas=fonte["respostas"], analise=nova, decisao="complementacao",
            status_atual=cadastro["status"], momento=momento_local)
        numero = ultima["numero"] + 1 if ultima else 1
        conn.execute(f"""INSERT INTO {TABLE}
            (solicitacao_id,numero,origem,fonte_sha256,conteudo,pdf,pdf_sha256,gerado_por)
            VALUES (%s,%s,'analise_vigente',%s,%s,%s,%s,%s)""",
            (pedido["id"], numero, assinatura, Jsonb({**fonte, "parecer_texto": texto}),
             pdf, sha256(pdf).hexdigest(), autor))
        conn.execute("""UPDATE demandas.analise_demanda SET parecer_texto=%s,parecer_pdf=%s,
            parecer_pdf_gerado_em=%s WHERE demanda_codigo=%s""", (texto, pdf, momento, pedido["demanda_codigo"]))
    return estado(pedido)


def revisar(pedido, assinatura, user):
    with atomic_connection() as conn:
        pedido = pedidos.obter(pedido["id"], interno=True, lock=True)
        _validar_pedido(pedido)
        atual = estado(pedido)
        if not atual["atualizado"] or atual["pdf_sha256"] != assinatura:
            raise DemandaValidationError("O parecer mudou ou está desatualizado. Atualize e revise novamente.", field="parecer")
        conn.execute(f"UPDATE {TABLE} SET revisado_por=%s,revisado_em=now() WHERE solicitacao_id=%s AND numero=%s",
                     (user.id, pedido["id"], atual["numero"]))
    return estado(pedido)
