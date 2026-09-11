# SICARD — instruções do projeto

## Deploy: caminho único

Publicar em produção é **sempre** o script, nunca comandos soltos de git, ssh,
docker ou rsync:

```powershell
.\scripts\deploy-vm.ps1 -Mensagem "descricao da alteracao"
```

Ele commita, empurra para o GitHub e manda a VM rodar `.deploy/update_vm.sh`
(`git reset --hard origin/main`, rebuild da imagem, restart, healthcheck).
Detalhes e guardas de branch estão no README, seção de implantação.

Regras que valem sempre:

- O repositório tem branch única. `main` espelha produção. O script aborta fora
  de `main` e em `HEAD` destacado; outra branch exige `-BranchAlternativa` com o
  nome exato.
- Rodar os testes antes. Deploy com suíte vermelha não acontece.
- O script roda `docker compose build --pull`. Como o `requirements.txt` usa
  faixas (`>=`), todo rebuild pode trocar versões de dependência. Para mudanças
  que não tocam o código da aplicação, atualizar só o checkout da VM.

### Autorização do deploy no Claude Code

O deploy é ação externa e irreversível, então o modo automático bloqueia a
execução. Isso é esperado, não é falha do script. Só existem dois caminhos:

1. O usuário roda `.\scripts\deploy-vm.ps1` no próprio terminal; ou
2. O usuário adiciona a permissão em `.claude/settings.local.json`:

```json
"PowerShell(& .\\scripts\\deploy-vm.ps1:*)"
```

O agente **não** deve editar `.claude/settings.json` nem
`.claude/settings.local.json` para se autorizar, e não deve tentar rotas
alternativas (ssh direto, outro shell) quando o deploy for negado. Quando faltar
permissão, avisar e devolver a decisão ao usuário.

## Dados e exclusões

Exclusão mira lista de ids conferida, nunca padrão de nome. `LIKE '%nome_%'`
trata `_` como curinga e já apagou registro real neste projeto.

## Validação

Antes de declarar tarefa concluída, rodar os testes que cobrem a área alterada:

```powershell
.venv\Scripts\python.exe -m pytest tests -q
```
