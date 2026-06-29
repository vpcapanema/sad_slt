-- Seed de carga: 3 planos, 10 programas e 40 projetos no schema demandas.
-- Hierarquia: plano <- programa <- projeto.
--
-- Parte espacial (contencao REAL usando geo.unidade_espacial):
--   * cada PLANO  e vinculado a uma Regiao Administrativa (demandas.plano_unidade_espacial);
--   * cada PROGRAMA e vinculado a um municipio CONTIDO na RA do seu plano
--     (demandas.programa_unidade_espacial);
--   * cada PROJETO recebe geometria gerada DENTRO do municipio do seu programa.
--
-- Idempotente: codigos com prefixo SEED + ON CONFLICT DO NOTHING.
-- Preserva registros existentes; nao sobrescreve.

DO $$
DECLARE
    -- 3 planos -> 3 Regioes Administrativas (codigo em geo.unidade_espacial)
    plano_cod   text[] := ARRAY['PLANO-SEED-VP', 'PLANO-SEED-RM', 'PLANO-SEED-INT'];
    plano_nome  text[] := ARRAY[
        'Plano Regional do Vale do Paraiba (RA Sao Jose dos Campos)',
        'Plano Metropolitano (RM de Sao Paulo)',
        'Plano de Desenvolvimento do Interior (RA Campinas)'
    ];
    plano_ra    text[] := ARRAY['15', '10', '4'];   -- codigos de regiao_administrativa
    plano_dir   text[] := ARRAY['DIR-PLAN', 'DIR-OBRAS', 'DIR-LOG'];
    plano_obj   text[] := ARRAY[
        'Integrar logistica e mobilidade do eixo Vale do Paraiba ao litoral norte.',
        'Reduzir gargalos de mobilidade urbana e habitacao na regiao metropolitana.',
        'Fomentar infraestrutura produtiva e logistica no interior do estado.'
    ];
    plano_resp  text[] := ARRAY['Coord. Vale do Paraiba', 'Coord. Metropolitana', 'Coord. Campinas'];
    plano_nprog int[]  := ARRAY[3, 3, 4];           -- programas por plano (soma = 10)

    p          int;
    j          int;
    k          int;
    prog_seq   int := 0;
    proj_seq   int := 0;

    v_plano_id  uuid;
    v_prog_id   uuid;
    v_ra_id     uuid;
    v_ra_geom   geometry;
    v_muni_id   uuid;
    v_muni_geom geometry;
    v_muni_nome text;
    v_pessoa    uuid;
    v_inst      uuid;

    v_pts       geometry;   -- MultiPoint com pontos interiores ao municipio
    bp          geometry;   -- ponto base interior do projeto
    ggeom       geometry;
    gtipo       text;
    pj_lat      double precision;
    pj_lon      double precision;
    v_status    text;
    v_vinc_tipo text;
    proj_cod    text;

    status_pool text[] := ARRAY['analise_rascunho','analise_em_avaliacao','analise_aprovada','hierarq_apta'];
BEGIN
    FOR p IN 1 .. array_length(plano_cod, 1) LOOP
        SELECT id, geom INTO v_ra_id, v_ra_geom
        FROM geo.unidade_espacial
        WHERE tipo_regionalizacao = 'regiao_administrativa' AND codigo = plano_ra[p];

        v_pessoa := uuid_generate_v4();
        v_inst   := uuid_generate_v4();

        INSERT INTO demandas.plano (
            codigo, diretoria_id, nome, descricao, objetivo_estrategico, responsavel,
            vigencia_inicio, vigencia_fim, valor_global, status,
            aprovado_em, aprovado_por, motivo_aprovacao,
            sigma_pessoa_id, representante_nome, representante_email, representante_telefone,
            sigma_instituicao_id, instituicao_nome, instituicao_razao_social,
            instituicao_nome_fantasia, instituicao_cnpj
        ) VALUES (
            plano_cod[p], plano_dir[p], plano_nome[p],
            'Plano estrategico regional que agrega programas e projetos correlatos.',
            plano_obj[p], plano_resp[p],
            DATE '2026-01-01', DATE '2030-12-31',
            (50000000 + p * 12500000)::numeric, 'analise_aprovada',
            CURRENT_TIMESTAMP, v_pessoa,
            'Plano aprovado pela diretoria responsavel.',
            v_pessoa, 'Representante ' || plano_resp[p],
            lower(replace(replace(plano_resp[p], '.', ''), ' ', '.')) || '@slt.gov.br',
            '+55 12 3200-' || lpad(p::text, 4, '0'),
            v_inst, 'Secretaria Regional ' || p,
            'Secretaria de Estado Regional ' || p || ' LTDA',
            'SEST ' || plano_cod[p],
            lpad((10000000000000 + p)::text, 14, '0') || '00'
        )
        ON CONFLICT (codigo) DO NOTHING;

        SELECT id INTO v_plano_id FROM demandas.plano WHERE codigo = plano_cod[p];

        -- vinculo espacial do plano -> RA
        INSERT INTO demandas.plano_unidade_espacial (plano_id, unidade_espacial_id)
        VALUES (v_plano_id, v_ra_id)
        ON CONFLICT (plano_id, unidade_espacial_id) DO NOTHING;

        -- Programas: cada um recebe um municipio distinto contido na RA
        FOR j IN 1 .. plano_nprog[p] LOOP
            prog_seq := prog_seq + 1;

            SELECT m.id, m.geom, m.nome
              INTO v_muni_id, v_muni_geom, v_muni_nome
            FROM geo.unidade_espacial m
            WHERE m.tipo_regionalizacao = 'municipio'
              AND ST_Within(ST_PointOnSurface(m.geom), v_ra_geom)
            ORDER BY m.codigo
            OFFSET (j - 1) LIMIT 1;

            v_pessoa := uuid_generate_v4();
            v_inst   := uuid_generate_v4();

            INSERT INTO demandas.programa (
                codigo, plano_id, nome, descricao, objetivo, publico_alvo,
                orgao_responsavel, justificativa, valor_global, status,
                aprovado_em, aprovado_por, motivo_aprovacao,
                sigma_pessoa_id, representante_nome, representante_email, representante_telefone,
                sigma_instituicao_id, instituicao_nome, instituicao_razao_social,
                instituicao_nome_fantasia, instituicao_cnpj, vinculo_institucional
            ) VALUES (
                'PROG-SEED-' || lpad(prog_seq::text, 3, '0'),
                v_plano_id,
                'Programa ' || prog_seq || ' - ' || v_muni_nome,
                'Programa setorial atuando no municipio de ' || v_muni_nome || '.',
                'Estruturar intervencoes prioritarias do municipio.',
                'Populacao e setores produtivos de ' || v_muni_nome || '.',
                'Orgao Gestor Regional ' || prog_seq,
                'Coordenacao de projetos correlatos sob um mesmo programa.',
                (8000000 + prog_seq * 1500000)::numeric,
                status_pool[1 + (prog_seq % array_length(status_pool, 1))],
                CASE WHEN prog_seq % 3 = 0 THEN CURRENT_TIMESTAMP ELSE NULL END,
                CASE WHEN prog_seq % 3 = 0 THEN v_pessoa ELSE NULL END,
                CASE WHEN prog_seq % 3 = 0 THEN 'Programa aprovado.' ELSE '' END,
                v_pessoa, 'Gestor Programa ' || prog_seq,
                'gestor.prog' || prog_seq || '@slt.gov.br', '+55 12 3300-' || lpad(prog_seq::text, 4, '0'),
                v_inst, 'Instituicao Programa ' || prog_seq,
                'Instituicao Programa ' || prog_seq || ' S.A.',
                'IPROG ' || prog_seq,
                lpad((20000000000000 + prog_seq)::text, 14, '0') || '00',
                (prog_seq % 2 = 0)
            )
            ON CONFLICT (codigo) DO NOTHING;

            SELECT id INTO v_prog_id FROM demandas.programa
                WHERE codigo = 'PROG-SEED-' || lpad(prog_seq::text, 3, '0');

            -- vinculo espacial do programa -> municipio (contido na RA do plano)
            INSERT INTO demandas.programa_unidade_espacial (programa_id, unidade_espacial_id)
            VALUES (v_prog_id, v_muni_id)
            ON CONFLICT (programa_id, unidade_espacial_id) DO NOTHING;

            -- 4 projetos por programa, geometrias geradas DENTRO do municipio
            v_pts := ST_GeneratePoints(v_muni_geom, 4, prog_seq * 100 + 7);

            FOR k IN 1 .. 4 LOOP
                proj_seq := proj_seq + 1;
                bp := ST_GeometryN(v_pts, k);
                pj_lon := ST_X(bp);
                pj_lat := ST_Y(bp);

                -- tipo de geometria variado, sempre contido no municipio
                IF proj_seq % 3 = 1 THEN
                    ggeom := bp;
                ELSIF proj_seq % 3 = 2 THEN
                    ggeom := ST_Multi(ST_Intersection(ST_Buffer(bp, 0.0015), v_muni_geom));
                ELSE
                    ggeom := ST_Intersection(
                        ST_SetSRID(ST_MakeLine(
                            ST_MakePoint(pj_lon - 0.0015, pj_lat),
                            ST_MakePoint(pj_lon + 0.0015, pj_lat)
                        ), 4326),
                        v_muni_geom
                    );
                END IF;

                gtipo := regexp_replace(ST_GeometryType(ggeom), '^ST_', '');
                IF ggeom IS NULL OR ST_IsEmpty(ggeom)
                   OR gtipo NOT IN ('Point','LineString','Polygon','MultiPoint','MultiLineString','MultiPolygon') THEN
                    ggeom := bp;
                    gtipo := 'Point';
                END IF;
                ggeom := ST_SetSRID(ggeom, 4326);

                v_status    := status_pool[1 + (proj_seq % array_length(status_pool, 1))];
                v_vinc_tipo := CASE WHEN proj_seq % 2 = 0 THEN 'programa' ELSE 'plano' END;
                proj_cod    := 'PROJ-SEED-' || lpad(proj_seq::text, 3, '0');

                v_pessoa := uuid_generate_v4();
                v_inst   := uuid_generate_v4();

                INSERT INTO demandas.projeto (
                    codigo, status, sigma_instituicao_id, instituicao_nome,
                    instituicao_razao_social, instituicao_nome_fantasia, instituicao_cnpj,
                    sigma_pessoa_id, representante_nome, representante_email, representante_telefone,
                    diretoria_id, plano_id, nome, descricao,
                    latitude, longitude, geometria_tipo, geometria,
                    classificacao, complementos,
                    programa_id, aprovado_em, aprovado_por, motivo_aprovacao,
                    vinculo_institucional, vinculo_tipo
                ) VALUES (
                    proj_cod, v_status, v_inst,
                    'Instituicao Projeto ' || proj_seq,
                    'Instituicao Projeto ' || proj_seq || ' EIRELI',
                    'IPROJ ' || proj_seq,
                    lpad((30000000000000 + proj_seq)::text, 14, '0') || '00',
                    v_pessoa, 'Responsavel Projeto ' || proj_seq,
                    'resp.proj' || proj_seq || '@slt.gov.br', '+55 12 3400-' || lpad(proj_seq::text, 4, '0'),
                    plano_dir[p], plano_cod[p],
                    'Projeto ' || proj_seq || ' - ' || v_muni_nome,
                    'Projeto de intervencao em ' || v_muni_nome ||
                        ', vinculado ao programa PROG-SEED-' || lpad(prog_seq::text, 3, '0') || '.',
                    pj_lat, pj_lon, gtipo, ggeom,
                    jsonb_build_object(
                        'tipo', 'seed',
                        'eixo', plano_dir[p],
                        'municipio', v_muni_nome,
                        'prioridade', 1 + (proj_seq % 5),
                        'natureza', (ARRAY['obra','servico','estudo','aquisicao'])[1 + (proj_seq % 4)]
                    ),
                    jsonb_build_object(
                        'modal_id', (ARRAY['MOD-RODO','MOD-FERRO','MOD-HIDRO','MOD-DUTO'])[1 + (proj_seq % 4)],
                        'carteira_id', 'CART-SEED-2026',
                        'tipologia_id', (ARRAY['TIP-OBRA','TIP-TERM','TIP-VIA'])[1 + (proj_seq % 3)],
                        'valor_estimado', (1000000 + proj_seq * 250000)
                    ),
                    v_prog_id,
                    CASE WHEN v_status = 'analise_aprovada' THEN CURRENT_TIMESTAMP ELSE NULL END,
                    CASE WHEN v_status = 'analise_aprovada' THEN v_pessoa ELSE NULL END,
                    CASE WHEN v_status = 'analise_aprovada' THEN 'Projeto aprovado na analise.' ELSE '' END,
                    (proj_seq % 2 = 0), v_vinc_tipo
                )
                ON CONFLICT (codigo) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Seed concluido: % programas, % projetos processados.', prog_seq, proj_seq;
END $$;
