from pathlib import Path

from redistribuir_camadas_risco_restricao import LOCAL, export_fiona, export_ibama_embargoes, first_path


def main() -> None:
    exports = [
        ("embargos_estaduais_sigam", "embargos_estaduais/*.geojson", None, False),
        ("areas_restricao_cetesb", "interdicoes_cetesb/**/*.shp", None, False),
        ("quilombos_sp", "quilombos/**/*.shp", lambda row: row.get("cd_uf") == "SP", True),
        ("sitios_arqueologicos", "sitios_arqueologicos/**/*.shp", None, True),
        ("terras_indigenas_sp", "terras_indigenas/**/*.shp", lambda row: row.get("uf_sigla") == "SP", True),
        (
            "ucs_protecao_integral_sp",
            "ucs_mma/*.shp",
            lambda row: row.get("grupo") == "Proteção Integral" and "SÃO PAULO" in (row.get("uf") or ""),
            True,
        ),
        (
            "ucs_uso_sustentavel_sp",
            "ucs_mma/*.shp",
            lambda row: row.get("grupo") == "Uso Sustentável" and "SÃO PAULO" in (row.get("uf") or ""),
            True,
        ),
        ("vegetacao_nativa_sp", "vegetacao_sp/**/*.shp", None, False),
    ]
    for layer_name, pattern, predicate, clip_to_sp in exports:
        count = export_fiona(first_path(pattern), "restrição", layer_name, predicate, clip_to_sp)
        print(f"restrição/{layer_name}: {count}")
    print(f"restrição/embargos_ibama_ativos_sp: {export_ibama_embargoes()}")


if __name__ == "__main__":
    main()
