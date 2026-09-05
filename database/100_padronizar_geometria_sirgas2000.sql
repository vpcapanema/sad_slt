-- SLT — padroniza o CRS de armazenamento das tabelas geoespaciais vivas para
-- EPSG:4674 (SIRGAS 2000), o CRS oficial do sistema (SYSTEM_CRS na aplicação).
--
-- Motivação: o schema gravava geometria em EPSG:4326 (WGS 84) por convenção
-- de código, nunca declarada como padrão em lugar nenhum — o próprio backend
-- já trata EPSG:4674 como o CRS canônico (importação, exportação,
-- documentação). A divergência forçava toda leitura a reprojetar 4674→4326
-- silenciosamente, e todo cálculo de área/distância no banco rodava sobre um
-- datum que não é o oficial do território.
--
-- Escopo: só as tabelas vivas do acervo de geoprocessamento (importação,
-- homologação, processamento) — 549 mil feições, ~176 registros de camada.
-- `demandas`/`ahp_objetos` e as tabelas legadas (camada/camada_feicao/
-- camada_vetor/camada_raster/produto*, todas com 0 linhas) ficam de fora
-- desta migração: têm consumidores próprios (mapa público, geocodificação) e
-- merecem avaliação em separado antes de mudar de CRS.
--
-- USING ST_Transform reprojeta cada geometria existente no próprio ALTER —
-- não há linha perdida nem geometria descartada, só a representação numérica
-- muda de datum. Operação bloqueante (reescreve a tabela inteira); rode fora
-- de horário de pico se a tabela de feições estiver muito maior que hoje.
--
-- As colunas `geom` das quatro tabelas de feição NÃO recebem um typmod
-- (`geometry(Geometry,4674)`) — a migração 056_geom_aceita_z.sql já as
-- relaxou para `geometry` genérico de propósito, porque o typmod fixa 2D e
-- rejeita coordenada Z. Fixar o SRID aqui reintroduziria essa rejeição.
-- ST_Transform lê o SRID de cada geometria pelo próprio valor, não pelo
-- typmod da coluna, então a reprojeção funciona igual sem a coluna tipada.
-- Só os envelopes (sempre 2D, nunca tocados pela 056) recebem o typmod.

BEGIN;

ALTER TABLE geoprocessamento.camada_importada
    ALTER COLUMN envelope TYPE geometry(Geometry,4674)
    USING ST_Transform(envelope, 4674);

ALTER TABLE geoprocessamento.camada_importada_feicao
    ALTER COLUMN geom TYPE geometry
    USING ST_Transform(geom, 4674);

ALTER TABLE geoprocessamento.camada_homologada
    ALTER COLUMN envelope TYPE geometry(Geometry,4674)
    USING ST_Transform(envelope, 4674);

ALTER TABLE geoprocessamento.camada_homologada_feicao
    ALTER COLUMN geom TYPE geometry
    USING ST_Transform(geom, 4674);

ALTER TABLE geoprocessamento.camada_processada
    ALTER COLUMN envelope TYPE geometry(Geometry,4674)
    USING ST_Transform(envelope, 4674);

ALTER TABLE geoprocessamento.camada_processada_feicao
    ALTER COLUMN geom TYPE geometry
    USING ST_Transform(geom, 4674);

COMMIT;
