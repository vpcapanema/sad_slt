-- Preserva autorias históricas desconhecidas; proíbe novos registros sem autor.
BEGIN;
-- Remove a regra antiga que substituía o usuário pelo representante legal.
DROP TRIGGER IF EXISTS trg_plano_auditoria_representante ON demandas.plano;
DROP TRIGGER IF EXISTS trg_programa_auditoria_representante ON demandas.programa;
DROP TRIGGER IF EXISTS trg_projeto_auditoria_representante ON demandas.projeto;
ALTER TABLE demandas.plano DROP CONSTRAINT IF EXISTS ck_plano_criado_por_representante;
ALTER TABLE demandas.programa DROP CONSTRAINT IF EXISTS ck_programa_criado_por_representante;
ALTER TABLE demandas.projeto DROP CONSTRAINT IF EXISTS ck_projeto_criado_por_representante;

-- Atribuição expressamente definida para o acervo SEI, sem alterar o representante.
UPDATE demandas.plano SET criado_por='f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid
 WHERE codigo LIKE '%-SEI-%' AND criado_por IS DISTINCT FROM 'f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid;
UPDATE demandas.programa SET criado_por='f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid
 WHERE codigo LIKE '%-SEI-%' AND criado_por IS DISTINCT FROM 'f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid;
UPDATE demandas.projeto SET criado_por='f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid
 WHERE codigo LIKE '%-SEI-%' AND criado_por IS DISTINCT FROM 'f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid;
CREATE OR REPLACE FUNCTION demandas.fn_exigir_autor_criacao()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.criado_por IS NULL OR NEW.criado_por = '00000000-0000-0000-0000-000000000000'::uuid THEN
        IF TG_OP = 'INSERT' THEN
            RAISE EXCEPTION 'Demanda não pode ser cadastrada sem criado_por' USING ERRCODE = '23514';
        ELSIF OLD.criado_por IS NOT NULL THEN
            RAISE EXCEPTION 'Autoria de criação não pode ser removida' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF TG_OP = 'INSERT' AND NEW.codigo LIKE '%-SEI-%' THEN
        NEW.criado_por := 'f08492fe-7740-4ad7-a615-6bf00db7730b'::uuid;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_plano_exigir_autor_criacao ON demandas.plano;
CREATE TRIGGER trg_plano_exigir_autor_criacao BEFORE INSERT OR UPDATE OF criado_por
ON demandas.plano FOR EACH ROW EXECUTE FUNCTION demandas.fn_exigir_autor_criacao();
DROP TRIGGER IF EXISTS trg_programa_exigir_autor_criacao ON demandas.programa;
CREATE TRIGGER trg_programa_exigir_autor_criacao BEFORE INSERT OR UPDATE OF criado_por
ON demandas.programa FOR EACH ROW EXECUTE FUNCTION demandas.fn_exigir_autor_criacao();
DROP TRIGGER IF EXISTS trg_projeto_exigir_autor_criacao ON demandas.projeto;
CREATE TRIGGER trg_projeto_exigir_autor_criacao BEFORE INSERT OR UPDATE OF criado_por
ON demandas.projeto FOR EACH ROW EXECUTE FUNCTION demandas.fn_exigir_autor_criacao();
COMMIT;
