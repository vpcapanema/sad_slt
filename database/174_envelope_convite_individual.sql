BEGIN;
ALTER TABLE ahp.convite_individual
    ADD COLUMN IF NOT EXISTS envelope_cifrado bytea;
COMMIT;
