-- Repara ambientes colaborativos de portfólio criados sem copiar o vínculo
-- de hierarquização existente na configuração multicritério selecionada.

UPDATE ahp.comparacao_colaborativa_ambiente AS ambiente
   SET hierarquizacao_id = config.hierarquizacao_id,
       atualizado_em = now()
  FROM ahp.config_multicriterio_portfolio AS config
 WHERE ambiente.hierarquizacao_id IS NULL
   AND ambiente.config_tipo = 'portfolio'
   AND ambiente.config_id = config.id
   AND config.hierarquizacao_id IS NOT NULL;

