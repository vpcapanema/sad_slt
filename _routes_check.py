from api.repositories import (
    config_multicriterio_repository as cfg,
)
from api.repositories import (
    dominio_repository,
    objeto_ahp_repository,
)
from api.repositories import (
    hierarquizacao_repository as hier,
)

print("status_objeto_ahp:", len(dominio_repository.list_status_objeto_ahp()))
print("objetos (projetos):", len(objeto_ahp_repository.list_all()))
print("config avulsa:", len(cfg.list_all("avulsa")))
print("config portfolio:", len(cfg.list_all("portfolio")))
print("hierarquizacoes:", len(hier.list_all()))
print("SMOKE OK")
