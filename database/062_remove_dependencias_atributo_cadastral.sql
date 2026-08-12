-- Dependencias e predecessores sao relacionamentos dinamicos do ciclo de vida,
-- nao atributos estaveis do cadastro inicial.
BEGIN;

UPDATE demandas.plano
SET atributos_cadastrais = atributos_cadastrais - 'dependencias_predecessoras'
WHERE atributos_cadastrais ? 'dependencias_predecessoras';

UPDATE demandas.programa
SET atributos_cadastrais = atributos_cadastrais - 'dependencias_predecessoras'
WHERE atributos_cadastrais ? 'dependencias_predecessoras';

UPDATE demandas.projeto
SET atributos_cadastrais = atributos_cadastrais - 'dependencias_predecessoras'
WHERE atributos_cadastrais ? 'dependencias_predecessoras';

DELETE FROM demandas.dom_atributo_objeto
WHERE codigo = 'dependencias_predecessoras';

COMMIT;
