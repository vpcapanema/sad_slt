# Camadas da VM no Codespace

O Codespace le os arquivos completos pela API REST existente do SFTPGo em
`https://56.125.163.194/sicard/storage-api/user/`. Nenhuma porta ou protocolo
novo precisa ser publicado na VM. SSH continua sujeito ao grupo de seguranca.

`bash scripts/start-storage-codespace.sh` monta `data/storage` com FUSE. O
adaptador mantem os caminhos normais de GDAL, GeoPandas, SQLite e Shapefiles.
Cada leitura retorna exatamente os bytes solicitados; ler ate o fim retorna
100% do arquivo original, sem amostragem, simplificacao ou limite de feicoes.
Respostas truncadas ou servidores que ignoram Range causam erro, nunca uma
camada aparentemente completa. O cache de leitura fica somente na memoria
(ate 32 MiB por montagem); nao existe copia integral persistente para leitura.

As credenciais existentes ficam no `.env` ignorado pelo Git, permissao 600:
`SICARD_STORAGE_API_URL`, `SICARD_STORAGE_API_USER`,
`SICARD_STORAGE_API_PASSWORD`. Nao ha credenciais neste documento nem nos scripts.

Apos a migracao verificada, `.deploy/storage-api.local.ready` habilita tres
montagens adicionais da pasta `base-geodatabase/codespace-geoespacial`:
`data/geoespacial/local`, `arquivados` e `biblioteca_canonica`. Os caminhos e os
arquivos auxiliares das camadas permanecem iguais. A biblioteca admite gravacao:
arquivos abertos para escrita usam temporariamente `~/.cache/sicard-write` e
sao enviados pela mesma API. Se o envio falhar, o temporario e preservado para
recuperacao; o erro e devolvido ao chamador. Saidas de processamento e uploads
locais continuam nas pastas de trabalho usuais.

O marcador de migracao e os relatorios `.deploy/*.local.*` sao locais. Preserve
o `.env` e o marcador antes de excluir/recriar completamente o Codespace.
Reinicios normais remontam o storage pelo `postStartCommand` do devcontainer.
Para desmontar, encerre os processos que leem os dados e use
`fusermount -u CAMINHO_DA_MONTAGEM`. Nao apague arquivos atraves da montagem:
na biblioteca gravavel isso altera os dados remotos.

A liberacao de espaco exige um manifesto com SHA-256 de cada arquivo local,
comparacao do arquivo reconstruido na VM e verificacao da leitura pelo
Codespace. O sparse-checkout exclui as tres pastas de dados da materializacao
do Git; `GIT_LFS_SKIP_SMUDGE=1` evita baixar as camadas novamente. O historico
e os ponteiros LFS do repositorio permanecem preservados.

O adaptador marca os arquivos ja versionados das montagens com `skip-worktree`
e `assume-unchanged` no indice local, para o Git nao reler dados remotos nem
grava-los novamente no cache LFS. Isso se aplica somente as tres pastas de
camadas; o codigo continua sendo acompanhado normalmente pelo Git.
