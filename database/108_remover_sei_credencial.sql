-- SLT — remove a guarda de credencial da integração por navegação no portal SEI.
--
-- APLICAR SOMENTE APÓS CONFERIR O CONTEÚDO DA TABELA. O DROP é irreversível e a
-- migration está separada da 107 exatamente por isso: a criação do repositório
-- de PDFs não depende desta remoção.
--
-- Conferência recomendada antes de aplicar:
--     SELECT count(*) FROM integracoes.sei_credencial;
--
-- Depois de aplicada, a variável SEI_CREDENTIALS_SECRET_KEY deixa de ter uso e
-- pode ser retirada do ambiente da VM.
BEGIN;

DROP TABLE IF EXISTS integracoes.sei_credencial;

COMMIT;
