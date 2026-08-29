from __future__ import annotations

import re
import unittest
from pathlib import Path


WINDOWS_HOST_PATH = re.compile(
    r"(?<![A-Za-z0-9])(?:[A-Za-z]:[\\/]|\\\\[A-Za-z0-9._-]+[\\/])"
)
UNIX_HOST_PATH = re.compile(
    r"(?<![A-Za-z0-9:])/(?:home|Users|opt|tmp|srv|mnt|workspace)/[A-Za-z0-9._~/-]+"
)
TEXT_SUFFIXES = {
    ".css", ".html", ".ini", ".js", ".json", ".md", ".ps1", ".py",
    ".sql", ".toml", ".txt", ".yaml", ".yml",
}
# tmp/ guarda rascunhos e artefatos gerados (fora do versionamento) e .vscode/
# guarda configuracao de editor, legitimamente presa a maquina de quem edita.
# O teste vigia o codigo da aplicacao, onde caminho absoluto e defeito de fato.
IGNORED_PARTS = {".git", ".venv", "node_modules", "__pycache__", "tmp", ".vscode"}
# Arquivos em que o caminho absoluto e o proprio conteudo, e nao um vazamento:
# o script que fala com a VM, a doc que a descreve e registros/artefatos que
# gravaram o diretorio da maquina que os gerou. Nenhum e codigo de aplicacao.
INTENTIONAL_FIXTURES = {
    Path("tests/test_path_policy.py"),
    Path("scripts/deploy-vm.ps1"),
    Path("README.md"),
    Path("documentacao/hierarquizacao/DIAGNOSTICO_DADOS_FAVORABILIDADE_REDE.md"),
    Path("data/geoespacial/relatorios/inventario_fontes_brutas_fase1.json"),
}
VENDORED_ROOTS = (Path("assets/vendor"),)


class NoAbsolutePathsTest(unittest.TestCase):
    def test_repositorio_nao_contem_caminhos_absolutos_de_host(self) -> None:
        violations: list[str] = []
        for file_path in Path(".").rglob("*"):
            if not file_path.is_file() or any(part in IGNORED_PARTS for part in file_path.parts):
                continue
            relative = Path(*file_path.parts[1:]) if file_path.parts[:1] == (".",) else file_path
            if relative in INTENTIONAL_FIXTURES:
                continue
            if any(relative.is_relative_to(root) for root in VENDORED_ROOTS):
                continue
            if file_path.suffix.lower() not in TEXT_SUFFIXES and file_path.name != ".env.example":
                continue
            try:
                content = file_path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            for line_number, line in enumerate(content.splitlines(), 1):
                if WINDOWS_HOST_PATH.search(line) or UNIX_HOST_PATH.search(line):
                    violations.append(f"{relative.as_posix()}:{line_number}")

        self.assertEqual(violations, [], "Caminhos absolutos encontrados: " + ", ".join(violations))


if __name__ == "__main__":
    unittest.main()
