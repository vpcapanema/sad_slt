from pydantic import BaseModel


class OpcaoVinculacaoSchema(BaseModel):
    codigo: str
    nome: str
