# Contribuições do SEI no MOCAD (SICARD)

Revisão: 2026-09-14.

## Fluxo

O analista envia os PDFs recebidos pelo SEI, escolhe antes da análise se o
cadastro será de Plano, Programa ou Projeto, e comanda o processamento. Projeto
é o padrão. O resultado é uma proposta auditável: campos sem evidência ficam em
branco e conflitos permanecem visíveis para decisão humana.

Os arquivos ficam integralmente em `integracoes.sei_documento.conteudo`. O
SHA-256 impede duplicata binária e a criação de demanda continua idempotente.

## Processamento

O motor está em `api/services/sei_processamento.py` e o fluxo de repositório em
`api/services/sei_repositorio_service.py`. Os extratores anteriores foram
removidos. O processamento atual:

- inventaria e processa todas as páginas;
- usa texto nativo quando suficiente e OCR Tesseract em português nas páginas
  digitalizadas ou com camada textual insuficiente;
- classifica cada página por papel documental;
- procura candidatos conforme o contrato de campos do tipo escolhido;
- normaliza datas, moeda, prazo, coordenadas e identificadores;
- conserva página, trecho, método, papel da fonte e confiança;
- não seleciona silenciosamente valores concorrentes equivalentes;
- deixa referências cadastrais aguardando resolução no SIGMA/SICARD.

O contrato funcional está em `config/campos-cadastro-demanda.json`. A análise
do corpus real que fundamentou a arquitetura está em
`documentacao/geral/analise_corpus_contribuicoes_sei.md`.

## Persistência

A migration `110_sei_processamento_estruturado.sql` acrescenta `tipo_demanda`,
com domínio Plano, Programa ou Projeto, e `analise`, JSONB com páginas,
segmentos, candidatos, conflitos, métricas e resultados completos por campo.

`campos_sugeridos` mantém somente valores normalizados com confiança mínima,
para consumo da revisão. `evidencias` mantém o recorte auditável por campo.

## Dependências operacionais

O container instala `tesseract-ocr` e `tesseract-ocr-por`. O Python usa
PyMuPDF, Pillow e pytesseract. Sem o executável OCR, documentos textuais ainda
são processados e a análise registra aviso explícito nas páginas afetadas.

Os limites são 80 MB por arquivo e 160 MB por lote. O Nginx aceita 170 MB para
acomodar o corpo multipart.

## Criação da demanda

O analista revisa os resultados e completa campos obrigatórios. A criação usa
os mesmos schemas e serviços regulares de Plano, Programa e Projeto. O tipo
analisado não pode ser trocado silenciosamente durante a revisão; para outro
tipo, o documento deve ser reanalisado com o contrato correspondente.

## Implantação

Antes de publicar a funcionalidade, aplicar em ordem:

1. `database/107_sei_documento.sql`, quando a tabela ainda não existir;
2. `database/110_sei_processamento_estruturado.sql`;
3. rebuild do container para instalar OCR e dependências Python.

Depois do deploy, validar um PDF textual, um digitalizado e um híbrido no fluxo
autenticado, conferindo página e evidência de cada sugestão.
