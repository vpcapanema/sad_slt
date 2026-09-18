# Fluxo geral de cruzamento espacial configurável

## 1. Configurar as entradas

- Uma ou mais **camadas de entrada**, de qualquer tipo: ponto, linha ou polígono.
- Para cada uma: o **identificador** do registro (por exemplo `proj_id`), o **filtro** de seleção e os **campos** a manter.

## 2. Configurar as bases

Agrupar as bases em **temas**, por exemplo socioeconômico, ambiental, fundiário, patrimônio e risco. Para cada base, definir:

- **Papel:**
  - *unidade de recorte*: divide as entradas, como município, bacia ou zona de transporte;
  - *base de atributos*: só acrescenta informação.
- **Forma de ligação:**
  - *por atributo*, com uma chave comum (código IBGE, por exemplo);
  - *por localização*, com um predicado: intersecta, contém ou está dentro.
- **Regra de multiplicidade**, quando o registro toca mais de uma feição:
  - maior sobreposição, primeira feição, todas (um registro por feição) ou resumo (contagem, soma, lista).
- **Campos** a trazer, com **prefixo** e **apelidos**.
- **Preparação** necessária, como buffer, reprojeção ou separação por tipo de geometria.

## 3. Recortar pela unidade de análise (opcional)

Quando houver uma unidade de recorte, dividir linhas e polígonos nos seus limites. Cada pedaço pertence a uma única unidade e guarda o vínculo com a feição de origem.

## 4. Enriquecer os registros

Percorrer os temas e as bases na ordem configurada. Em cada base, aplicar a forma de ligação e a regra de multiplicidade. Registros sem correspondência são mantidos, com os campos vazios.

## 5. Validar

- Número de registros e unicidade do identificador.
- Coerência entre cada registro e a unidade de recorte.
- Regra de multiplicidade aplicada corretamente.
- Comparação com um cruzamento de controle.

## 6. Consolidar as saídas

- **Arquivo completo:** um arquivo geográfico com uma camada por tipo de geometria de entrada.
- **Recortes por finalidade:** subconjuntos de campos definidos na configuração, como os campos de um conjunto de indicadores.

## 7. Exportar e documentar

- Tabelas de atributos em formatos tabulares, como CSV e XLSX.
- Dicionário de campos: nome, apelido, tema, base de origem e regra aplicada.
- Registro da configuração usada, para que o processamento possa ser reproduzido.
