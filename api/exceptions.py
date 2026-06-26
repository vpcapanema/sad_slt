"""Exceções de domínio da API SLT."""


class SLTError(Exception):
    """Base para erros tratados pela camada HTTP."""


class DatabaseUnavailableError(SLTError):
    """Banco SLT indisponível ou não configurado."""


class DemandaValidationError(SLTError):
    """Payload ou regra de negócio inválida."""

    def __init__(self, message: str, *, field: str | None = None) -> None:
        super().__init__(message)
        self.field = field


class DemandaNotFoundError(SLTError):
    """Demanda não encontrada."""


class AuthError(SLTError):
    """Falha de autenticação ou autorização."""


class ConfigMulticriterioNotFoundError(SLTError):
    """Configuração da análise multicritério não encontrada."""


class HierarquizacaoNotFoundError(SLTError):
    """Hierarquização de projetos não encontrada."""
