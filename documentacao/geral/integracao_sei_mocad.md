# Integração SEI-SP no MOCAD (SICARD)

Status: IMPLEMENTADO (2026-09-04) — pendente de validação manual contra o
SEI-SP real (login verdadeiro nunca foi executado durante o desenvolvimento).
Página em `/restrict/sei-integracao/`. Ver seção "Estado da implementação"
no final.
Revisão 2 (2026-09-04): substitui o desenho anterior (que envolvia o
SIGMA-PLI e uma tabela de staging). Decisão do usuário: **tudo dentro do
SICARD/MOCAD, sem tabela paralela** — as demandas vindas do SEI entram
direto nas tabelas normais (`demandas.plano/programa/projeto`), só com um
identificador no campo `código` indicando a origem.

## Fluxo

1. Nova página de gestão no módulo **MOCAD** (mesmo bloco de
   `templates/paginas/admin/demandas.html`, que já roda
   `{% set bloco_modulo = "mocad" %}`).
2. **Seção de acesso ao SEI**: o usuário logado no SICARD informa suas
   próprias credenciais do SEI-SP (login pessoal dele no SEI, não uma
   credencial de serviço compartilhada). O backend usa essas credenciais
   para autenticar na API do SEI-SP em nome desse usuário.
   - **Checkbox "lembrar credencial"** (decisão do usuário, 2026-09-04):
     - Marcado → persiste a credencial **criptografada** no banco,
       associada ao usuário (reaproveitar mecanismo de criptografia já
       usado no projeto para dados sensíveis, se existir um equivalente ao
       `MASTER_KEY` do SIGMA-PLI — verificar antes de implementar).
     - Desmarcado → credencial fica só em memória/sessão do backend
       enquanto durar a sessão do usuário; nunca toca o banco.
   - Exibir **status de conexão** (conectado / erro / desconectado) na UI.
3. Com conexão ativa, listar os processos do SEI acessíveis a esse
   usuário como **"candidatos"** — uma revisão antes de virarem demanda de
   fato (nada é criado automaticamente sem essa etapa).
4. Para cada candidato, o sistema:
   - Lê o conteúdo do processo (ofício, anexos).
   - **Estima o tipo de demanda** (`plano`/`programa`/`projeto`) — regra
     inicial: default `projeto`, já que a esmagadora maioria dos processos
     SEI vem de terceiros externos (prefeituras, câmaras, empresas,
     deputados, cidadãos) — exatamente o perfil de `projeto` (única
     demanda com representante externo + geolocalização). `plano`/
     `programa` são majoritariamente internos (diretoria/gestor), improvável
     vir do SEI, mas a estimativa deve ficar visível e **editável** pelo
     usuário antes de confirmar (não é automático/cego).
   - **Extrai e pré-preenche os campos mínimos do formulário** de acordo
     com o tipo estimado (ex. para `projeto`: `nome`, `descricao`,
     `instituicao_id`/`representante` a partir do remetente do ofício,
     `lat`/`lng` via geocodificação do município/endereço citado,
     `diretoria_id`/`plano_id` — estes provavelmente exigem seleção manual
     do usuário, não dá pra inferir do texto do ofício).
5. Usuário revisa/edita os campos pré-preenchidos e confirma.
6. Na confirmação, o sistema chama o **mesmo fluxo de criação já
   existente** (`POST /api/demandas`, `/api/planos` ou `/api/programas`,
   conforme o tipo) — **nenhuma tabela nova para os dados da demanda em
   si**. A única marca de origem SEI é um componente no valor do campo
   `código` gerado (ver `api/codigos_demanda.py` / `api/constants.py`,
   hoje gera algo como `I-PRJ-XXXXXXXX`) — formato exato do marcador a
   definir na implementação (ex. incorporar o próprio número do processo
   SEI no lugar do hash aleatório, ou um segmento fixo tipo `-SEI-`).

## Pendências / decisões em aberto antes de implementar

1. **Confirmado (2026-09-04) com o usuário**: é o login normal do portal
   SEI-SP (usuário+senha que a pessoa usa em sei.sp.gov.br), não uma API
   de integração formal (SOAP/OAuth2 vistas na pesquisa anterior são de
   aplicação, não de usuário final). Implicação: o SICARD precisa
   **simular sessão de navegador** nesse login (POST no formulário de
   login do portal, manter cookies de sessão, navegar pelas telas de
   processos) — mais frágil que uma API oficial (sujeito a quebrar se o
   SEI mudar HTML/fluxo do site, pode esbarrar em CAPTCHA/2FA). Antes de
   implementar: inspecionar a estrutura real do login do portal SEI-SP
   (form fields, endpoint, mecanismo de sessão) para validar viabilidade
   técnica.
2. Confirmar se existe no SICARD algum mecanismo de criptografia de campo
   sensível já implementado (equivalente ao `MASTER_KEY` do SIGMA-PLI)
   para a opção "lembrar credencial". Se não existir, precisa ser criado
   antes de persistir qualquer senha.
3. Regra de geocodificação (texto do ofício → lat/lng) e regra de mapeamento
   remetente → instituição/representante (criar instituição/pessoa nova no
   cadastro se não existir, ou só aceitar processos de instituições já
   cadastradas?) — a definir.
4. Formato exato do marcador de origem SEI no campo `código`.

## Não fazer (já revertido em 2026-09-04)

- ~~Tabela `cadastro.contribuicoes_sei` no SIGMA-PLI~~ (revertida).
- ~~Colunas `origem_sei_processo/orgao/data_protocolo` em
  `demandas.projeto`~~ (revertidas).
- ~~Aba "Contribuições SEI" filtrada dentro de `/restrict/demandas/`~~
  (revertida) — substituída pela página de gestão dedicada no MOCAD
  descrita acima.

## Estado da implementação (2026-09-04)

Arquivos novos:
- `database/102_sei_integracao_credencial.sql` — schema `integracoes` +
  tabela `sei_credencial` (senha cifrada com Fernet). **NÃO aplicada.**
- `api/services/sei_integracao_service.py` — login interno e externo,
  sessão em memória por usuário, captcha, listagem e parsing de processos,
  `estimar_tipo_demanda()`.
- `api/repositories/sei_credencial_repository.py`
- `api/schemas/sei_integracao.py`
- `api/routers/sei_integracao.py` — `/api/sei/login-form`, `/conectar`,
  `/status`, `/desconectar`, `/processos`,
  `/processos/{numero}/criar-demanda`.
- `templates/paginas/admin/sei_integracao.html`, `admin/sei_integracao.js`

Arquivos alterados (todos retrocompatíveis, sem efeito nos fluxos atuais):
- `api/codigos_demanda.py` — kwarg opcional `origem` (default `""`);
  `origem="SEI"` gera `I-PRJ-SEI-XXXXXXXX`.
- `api/services/{demanda,plano,programa}_service.py` — repassam `origem`.
- `api/routers/__init__.py`, `api/server.py` — registro do router/página.
- `requirements.txt` (+`beautifulsoup4`, `cryptography`), `.env.example`
  (+`SEI_CREDENTIALS_SECRET_KEY`).

### O que precisa ser validado contra o SEI real (marcado como TODO no código)

1. Endpoint de listagem de processos pós-login (`SEI_LISTAR_PROCESSOS_URL_CANDIDATOS`)
   — hoje tenta uma lista de URLs prováveis e cai em lista vazia com aviso.
2. `_parse_tabela_processos()` — parsing genérico da primeira `<table>`.
3. Nome do campo de captcha (`txtInfraCaptcha`) e heurística de detecção.
4. `_login_aparenta_sucesso()` — heurística fraca (cookie + ausência de
   formulário/erro), precisa ser calibrada com uma resposta real.
5. `estimar_tipo_demanda()` — hoje sempre retorna `projeto` por decisão de
   produto; refinar depois se aparecerem casos de plano/programa vindos do SEI.
