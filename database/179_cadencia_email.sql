-- Reserva compartilhada entre processos e abas para cada conta de envio.
CREATE TABLE IF NOT EXISTS public.sicard_email_cadencia (
    conta text PRIMARY KEY,
    proximo_envio timestamptz NOT NULL
);

GRANT SELECT, INSERT, UPDATE ON public.sicard_email_cadencia TO slt_user;
