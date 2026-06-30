-- Identificador curto definido pelo usuário para nomear os artefatos JSON
-- gerados em cada fase do fluxo AHP.
--
-- Máscara aplicada no frontend: minúsculas, espaços → underline, sem acentos.
-- Os arquivos seguem o padrão: {denominacao}_fase1.json,
--                               {denominacao}_fase2.json,
--                               {denominacao}_homologado.json

ALTER TABLE ahp.config_multicriterio_avulsa
    ADD COLUMN IF NOT EXISTS denominacao VARCHAR(100);

ALTER TABLE ahp.config_multicriterio_portfolio
    ADD COLUMN IF NOT EXISTS denominacao VARCHAR(100);

COMMENT ON COLUMN ahp.config_multicriterio_avulsa.denominacao IS
    'Identificador curto definido pelo usuário; base do nome dos artefatos JSON de fase.';

COMMENT ON COLUMN ahp.config_multicriterio_portfolio.denominacao IS
    'Identificador curto definido pelo usuário; base do nome dos artefatos JSON de fase.';
