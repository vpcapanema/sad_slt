BEGIN;

INSERT INTO demandas.dom_status_demanda (codigo, nome, descricao, ordem, ativo, fase)
VALUES
 ('hierarq_homologada', 'Homologada', 'Resultados homologados, ainda não publicados.', 105, TRUE, 'hierarquizacao'),
 ('hierarq_publicada', 'Publicada', 'Resultados homologados com publicação vigente.', 115, TRUE, 'hierarquizacao')
ON CONFLICT (codigo) DO UPDATE SET
 nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, ordem=EXCLUDED.ordem, ativo=TRUE, fase=EXCLUDED.fase;

-- Operações dedicadas; não disponíveis no PATCH administrativo.
INSERT INTO demandas.dom_status_demanda_transicao (status_origem, status_destino, via_aprovar)
VALUES
 ('hierarq_em_andamento', 'hierarq_homologada', TRUE),
 ('hierarq_finalizada', 'hierarq_homologada', TRUE),
 ('hierarq_homologada', 'hierarq_publicada', TRUE),
 ('hierarq_finalizada', 'hierarq_publicada', TRUE),
 ('hierarq_ranqueada', 'hierarq_publicada', TRUE),
 ('hierarq_publicada', 'hierarq_homologada', TRUE),
 ('hierarq_ranqueada', 'hierarq_homologada', TRUE),
 ('hierarq_homologada', 'hierarq_em_andamento', TRUE),
 ('hierarq_publicada', 'hierarq_em_andamento', TRUE),
 ('hierarq_ranqueada', 'hierarq_em_andamento', TRUE)
ON CONFLICT (status_origem, status_destino) DO UPDATE SET via_aprovar=TRUE;

COMMIT;
