# Sistema de Apoio à Tomada de Decisão — Aplicação Web (SLT)

## Arquitetura de dados

| Origem | Uso | Gravação |
|--------|-----|----------|
| **SIGMA** (`cadastro.instituicao`, `cadastro.pessoa`, `usuarios.usuario`) | Leitura + login | Nunca pelo SLT |
| **Banco SLT** (container `slt_postgres` + PostGIS, porta **5434**) | Demandas, AHP, auditoria | Sim |

Cadastro de nova instituição: http://56.125.163.194/cadastro/instituicao

## Executar (desenvolvimento)

Abra o workspace da aplicação no Cursor/VS Code:

```text
sistema_apoio_a_tomada_de_decisao_web.code-workspace
```

Recomendado — um comando faz tudo (libera porta, sobe API, verifica conexões, abre o navegador):

```powershell
cd D:\REPOSITORIOS\sistema_apoio_a_tomada_de_decisao_web
.\scripts\start-dev.ps1
```

Manual:

```powershell
pip install -r requirements.txt
python -m api.server
```

Acesse: http://127.0.0.1:8080/

Verificação de saúde: `GET /api/health/ready` (API local, APIs externas, banco SLT se configurado via `SLT_DATABASE_URL`).

## Banco de dados SLT

**Container dedicado** — separado do SIGMA-PLI (`sigma_pli_db`, porta 5433).

| Item | Valor |
|------|-------|
| Container | `slt_postgres` |
| Imagem | `postgis/postgis:17-3.5` |
| Porta externa | **5434** |
| Banco | `slt_db` |
| Usuário (dev) | `slt_user` / `slt_pass` |

| Esquema | Tabela | Uso |
|---------|--------|-----|
| `cadastro` | `cadastro_demanda` | Demandas do formulário (SIGMA + geometria PostGIS + status) |
| `cadastro` | `dom_status_demanda` | Domínio de status do fluxo |
| `auditoria` | `log_sistema` | Logs e trilha de auditoria |

Subir o banco:

```powershell
.\scripts\start-db.ps1
# ou: docker compose up -d
```

O schema é aplicado automaticamente na **primeira** inicialização do volume. Para reaplicar:

```powershell
.\scripts\apply-database.ps1
```

Connection string da aplicação:

```
SLT_DATABASE_URL=postgresql://slt_user:slt_pass@127.0.0.1:5434/slt_db
```

## Módulos

| Módulo | Caminho |
|--------|---------|
| Hub | `index.html` |
| Cadastro de demandas | `cadastro/` |
| AHP | `ahp/` |
| Painel | `painel/` |

Demandas: persistidas em `cadastro.cadastro_demanda` via `POST /api/demandas` (painel: `GET /api/demandas`).

### API de demandas

| Método | Rota | Uso |
|--------|------|-----|
| `POST` | `/api/demandas` | Registra demanda do formulário |
| `GET` | `/api/demandas` | Lista demandas (painel) |
| `GET` | `/api/demandas/{codigo}` | Detalhe por código `DEM-...` |
| `PATCH` | `/api/demandas/{codigo}` | Atualiza demanda (gestor) |
| `POST` | `/api/demandas/{codigo}/aprovar` | Aprova e cria objeto AHP (gestor) |

### API de objetos e análises AHP

| Método | Rota | Auth | Uso |
|--------|------|------|-----|
| `GET` | `/api/ahp/objetos` | Gestor | Lista objetos AHP (filtros `status`, `grupo`) |
| `GET` | `/api/ahp/objetos/{codigo}` | Gestor | Detalhe do objeto |
| `PATCH` | `/api/ahp/objetos/{codigo}` | Gestor | Atualiza status/grupo |
| `POST` | `/api/ahp/analises` | Sessão opc. | Cria análise (`tipo`: `avulsa`\|`portfolio`) |
| `GET` | `/api/ahp/analises?tipo=` | Sessão opc. | Lista análises |
| `GET` | `/api/ahp/analises/{tipo}/{codigo}` | Sessão opc. | Detalhe |
| `PATCH` | `/api/ahp/analises/{tipo}/{codigo}` | Sessão opc. | Salva etapas (critérios, alternativas, julgamentos) |
| `POST` | `/api/ahp/analises/{tipo}/{codigo}/calcular` | Sessão opc. | Calcula pesos + ranking (servidor) |
| `POST` | `/api/ahp/analises/{tipo}/{codigo}/homologar` | Gestor | Homologa o ranking |

Persistência: `ahp.analise_avulsa` (alternativas manuais) e `ahp.analise_portfolio` (projetos de `ahp.objeto_ahp`, por `grupo_comparacao`).

### Fluxo AHP (frontend `ahp/`)

1. `tipo-analise` → escolhe avulsa/portfólio.
2. `step1`–`step4` → critérios e comparação pareada (escala de Saaty).
3. `step5` → pesos dos critérios + consistência (λmax, CI, CR).
4. `step6` → alternativas (manuais ou objetos AHP), julgamento par-a-par por critério, **ranking final** e persistência via API.

O motor de cálculo é único: `ahp/js/ahp-core.js` (frontend) e `api/services/analise_service.py` (servidor, fonte da verdade no `calcular`).

### Backend (camadas)

| Camada | Pasta |
|--------|-------|
| Rotas | `api/routers/` |
| Regras de negócio | `api/services/` |
| SQL / PostGIS | `api/repositories/` |
| Contratos HTTP | `api/schemas/` |
| Conexão DB | `api/db/` |

## Catálogo SLT

Fonte: `data/Catalogo_Hierarquico_SLT.xlsx`

```powershell
python scripts/gerar_catalogo_slt.py   # opcional: regenerar o xlsx
python scripts/export_catalogo.py      # gera data/catalogo-slt.json
```

## Dados de referência (`data/`)

| Arquivo | Uso |
|---------|-----|
| `catalogo-slt.json` | Diretorias, planos, frentes, eixos (cadastro) |
| `referencia-classificacao.json` | Textos de apoio PLI/PEF |
| `referencia-institucional.json` | Textos institucionais |
| `matriz-criterios-premissas.json` | Dimensões, critérios e premissas (AHP) |
| `Matriz_Criterios_Premissas_PLI-SP.xlsx` | Matriz completa em Excel |
