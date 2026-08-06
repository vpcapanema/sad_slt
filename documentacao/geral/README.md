# SICARD — Sistema Inteligente de Cadastro e Ranking de Demandas

Aplicação web de apoio à decisão para cadastrar, analisar, hierarquizar e
acompanhar planos, programas e projetos. O sistema combina análise multicritério
AHP, processamento geoespacial e trilha de auditoria.

O inventário detalhado do que está implementado está em
[`documentacao/STATUS_IMPLEMENTACAO.md`](documentacao/STATUS_IMPLEMENTACAO.md).

## Arquitetura

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| Backend | FastAPI / Python 3.11+ | API, autenticação, regras e páginas estáticas |
| Frontend | HTML, CSS e JavaScript | Formulários, painéis, AHP e bancadas espaciais |
| Banco SLT | PostgreSQL 17 + PostGIS 3.5 | Fonte definitiva dos dados do SICARD |
| SIGMA-PLI | API e PostgreSQL externos | Login, pessoas e instituições, somente leitura |

O backend é organizado em:

| Camada | Pasta |
|---|---|
| Rotas HTTP | `api/routers/` |
| Contratos | `api/schemas/` |
| Regras de negócio | `api/services/` |
| SQL e persistência | `api/repositories/` |
| Conexões | `api/db/` |

## Executar em desenvolvimento

Na raiz do repositório:

```powershell
.\scripts\start-dev.ps1
```

`start-dev.ps1` valida o `slt_db` em `56.125.163.194:5433`, confere as migrations,
inicia a API e valida as integrações. O Docker local não é iniciado. O comando
`apply-database.ps1` permanece disponível para manutenção do schema remoto.

Para validar todo o ambiente e encerrá-lo sem abrir o navegador:

```powershell
.\scripts\start-dev.ps1 -CheckOnly -NoBrowser
```

Execução manual da API:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m api.server
```

Endereços locais:

- aplicação: <http://127.0.0.1:8080/public/>;
- documentação OpenAPI: <http://127.0.0.1:8080/docs>;
- saúde básica: <http://127.0.0.1:8080/api/health>;
- prontidão das integrações: <http://127.0.0.1:8080/api/health/ready>.

## Configuração

Copie `.env.example` para `.env` e configure principalmente:

```dotenv
PORT=8080
SLT_USE_SIGMA_POSTGRES=true
SLT_SESSION_SECRET=
SIGMA_API_BASE=https://56.125.163.194
SIGMA_POSTGRES_PASSWORD=
```

O banco principal do SICARD está no mesmo PostgreSQL gerenciado do SIGMA:

| Item | Valor |
|---|---|
| Servidor | `56.125.163.194` |
| Porta | `5433` |
| Banco | `slt_db` |
| Gerenciador | container `sigma_pli_db` |

O `docker-compose.yml` local permanece apenas como contingência/rollback e não
é iniciado pelo `start-dev.ps1` quando `SLT_USE_SIGMA_POSTGRES=true`.

## Padrão de rotas

- APIs usam o prefixo `/api`.
- Páginas públicas usam `/public/`.
- Páginas operacionais usam `/restrict/`.
- URLs canônicas de páginas terminam em `/` e não contêm `.html`.
- Rotas antigas conhecidas redirecionam com status `308`, preservando a query.
- Arquivos estáticos são montados sob os mesmos blocos, mas não constituem URLs
  canônicas de navegação.

Rotas públicas principais:

| Rota | Uso |
|---|---|
| `/public/` | Entrada geral |
| `/public/cadastro/` | Cadastro de demandas |
| `/public/painel/` | Acompanhamento publicado |
| `/public/transparencia/` | Transparência e resultados |
| `/public/documentacao/` | Documentação funcional |
| `/public/login/` | Entrada da área restrita |
| `/public/ahp/colaborativa/` | Resposta a convite AHP por token |

Rotas restritas principais:

| Rota | Uso |
|---|---|
| `/restrict/` | Entrada interna |
| `/restrict/painel/` | Painel administrativo |
| `/restrict/demandas/` | Análise das demandas |
| `/restrict/hierarquizacao/` | Árvore metodológica |
| `/restrict/hierarquizacao/processos/` | Gestão das rodadas |
| `/restrict/ahp/` | Configuração multicritério |
| `/restrict/geoespacial/` | Ferramentas e produtos espaciais |

## Módulos implementados

### Demandas

Plano, programa e projeto são persistidos no esquema único `demandas`. A mesma
linha avança do cadastro à execução. Estão disponíveis criação, consulta,
atualização, exclusão, análise e aprovação. A matriz de transições é mantida no
banco e consultada pelo backend.

Famílias: `/api/demandas`, `/api/planos`, `/api/programas`, `/api/dominios` e
`/api/painel`.

### AHP

O módulo permite configurações avulsas e de portfólio, definição de universo,
critérios e premissas, comparação pareada, cálculo de pesos e consistência e
homologação. A comparação colaborativa cria convites com prazo e token público,
recebe as matrizes individuais e registra suas métricas.

Famílias: `/api/ahp/objetos`, `/api/ahp/universo`,
`/api/ahp/configuracoes` e `/api/ahp/comparacao-colaborativa`.

### Hierarquização

As rodadas persistem o universo e os resultados em um documento autocontido.
O fluxo metodológico possui:

1. elegibilidade territorial por risco e restrição;
2. favorabilidade territorial;
3. ajuste fino por atributos dos projetos;
4. síntese, ranking e homologação.

Família: `/api/ahp/hierarquizacoes`.

### Geoprocessamento

Inclui importação e catálogo de camadas, visualização vetorial e raster,
operações individuais, jobs, funções, fluxos e homologação. O armazenamento
físico separa camadas importadas, processadas e homologadas. Apenas snapshots
homologados formam a biblioteca oficial consumida pelas fases.

Família: `/api/geoespacial`. Os endpoints de algoritmos, operações e jobs
executam o fluxo efetivo usado pelas telas.

## Modelo de dados vigente

| Esquema | Responsabilidade |
|---|---|
| `demandas` | Planos, programas, projetos, indicadores, tipos e status |
| `ahp` | Objetos, configurações e comparação colaborativa |
| `hierarquizacao_demandas` | Rodadas, fases e rankings |
| `geo` | Regionalizações e unidades espaciais |
| `geoprocessamento` | Catálogo, feições, rasters, execuções e homologações |
| `auditoria` | Trilha de operações |

Referências a `cadastro.cadastro_demanda` e `demandas_aprovadas` pertencem ao
modelo histórico das migrations. A migration `015_colapso_demandas.sql`
consolidou o modelo atual no esquema `demandas`.

## Autorização

Os perfis são derivados do usuário SIGMA:

- `VISUALIZADOR`: consulta autorizada;
- `OPERADOR`: operações de cadastro e processamento;
- `ANALISTA`: análise e aprovação;
- `GESTOR`: análise, homologação e supervisão;
- `ADMIN`: administração técnica, sem herdar automaticamente decisões de
  analista ou gestor.

As permissões efetivas são aplicadas no backend por dependências de rota.

## Dados de referência

| Arquivo | Uso |
|---|---|
| `data/catalogo-slt.json` | Diretorias, planos, frentes e eixos |
| `data/referencia-classificacao.json` | Apoio à classificação PLI/PEF |
| `data/referencia-institucional.json` | Conteúdo institucional |
| `data/matriz-criterios-premissas.json` | Critérios e premissas AHP |

Scripts de manutenção:

```powershell
python scripts/gerar_catalogo_slt.py
python scripts/export_catalogo.py
python scripts/load_geo_catalog.py
```

## Testes

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

A suíte cobre autenticação e perfis, painéis, política de caminhos, parte do
motor geoespacial e o registro das famílias de rotas e páginas canônicas.

## Regra de cores de status

A fonte única é `assets/js/status-colors.js`. Não duplique cores de status em
HTML, CSS ou JavaScript de módulo. Novos status exigem atualização do domínio no
banco, de `STATUS_DEMANDA`, de `LEGEND_ORDER` e, quando aplicável, dos rótulos
tipados do backend.
