-- Status intermediário da análise: a demanda aguarda complementação do cadastro
-- e pode retornar à avaliação sem passar pela decisão final.
DO $$
BEGIN
    INSERT INTO demandas.dom_status_demanda (codigo, nome, descricao, ordem, ativo, fase)
    VALUES (
        'analise_aguardando_complementacao',
        'Aguardando complementação',
        'Análise interrompida até a complementação do cadastro pelo demandante',
        25,
        TRUE,
        'cadastro_analise'
    )
    ON CONFLICT (codigo) DO UPDATE SET
        nome = EXCLUDED.nome,
        descricao = EXCLUDED.descricao,
        ordem = EXCLUDED.ordem,
        ativo = EXCLUDED.ativo,
        fase = EXCLUDED.fase;

    INSERT INTO demandas.dom_status_demanda_transicao (status_origem, status_destino, via_aprovar)
    VALUES
        ('analise_em_avaliacao', 'analise_aguardando_complementacao', FALSE),
        ('analise_aguardando_complementacao', 'analise_aguardando_complementacao', FALSE),
        ('analise_aguardando_complementacao', 'analise_em_avaliacao', FALSE)
    ON CONFLICT (status_origem, status_destino) DO NOTHING;
END $$;