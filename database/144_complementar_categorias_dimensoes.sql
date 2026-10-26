-- Merge aditivo das dimensoes ausentes, preservando todas as categorias existentes.
BEGIN;

INSERT INTO dominios.categoria_extracao_atributos
    (codigo, nome, conceito, ordem)
SELECT novo.codigo, novo.nome, novo.conceito, novo.ordem
FROM (VALUES
    ('tecnica', 'Técnica',
     'Agrupa critérios de engenharia, condições físicas e desempenho operacional da infraestrutura e maturidade do projeto.', 80),
    ('financeiro', 'Financeiro',
     'Agrupa critérios de custo, retorno monetário do investimento e financiamento do projeto.', 90),
    ('seguranca', 'Segurança',
     'Agrupa critérios de sinistralidade viária, proteção de usuários vulneráveis e segurança do transporte de cargas perigosas.', 100),
    ('territorial', 'Territorial',
     'Agrupa critérios de integração territorial e modal, conflitos de tráfego e compatibilidade com o uso do solo.', 110),
    ('institucional', 'Institucional',
     'Agrupa critérios de viabilidade institucional, alinhamento ao planejamento, consenso entre atores e participação social.', 120),
    ('infraestrutura_servidoes', 'Infraestrutura e servidões',
     'Reúne interferências espaciais com faixas de domínio, servidões e ativos de infraestrutura existentes que podem impor compatibilização, anuência ou remanejamento.', 130),
    ('juridico_institucional', 'Jurídico-institucional',
     'Reúne embargos, interdições e demais atos jurídicos territorialmente aplicáveis capazes de impedir ou suspender a implantação até revisão formal pela autoridade competente.', 140)
) AS novo(codigo, nome, conceito, ordem)
WHERE NOT EXISTS (
    SELECT 1 FROM dominios.categoria_extracao_atributos existente
    WHERE existente.codigo = novo.codigo
       OR lower(btrim(existente.nome)) = lower(btrim(novo.nome))
)
ON CONFLICT DO NOTHING;

COMMIT;
