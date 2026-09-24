from __future__ import annotations

import re
import unittest
from pathlib import Path


# O nome do servidor UNC exige dois caracteres ou mais. Com um só, os escapes
# que o JSON obriga (\\r, \\n, \\t) imitavam um caminho de rede e acusavam
# arquivos de dados onde nao ha caminho nenhum.
WINDOWS_HOST_PATH = re.compile(
    r"(?<![A-Za-z0-9])(?:[A-Za-z]:[\\/]|\\\\[A-Za-z0-9._-]{2,}[\\/])"
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
# entregas/ e material local de trabalho no QGIS: o .gitignore o exclui e o
# deploy nao o publica. Sem ele aqui, o teste acusava artefatos da maquina de
# quem edita, que nao estao no repositorio e nunca chegam a VM.
# O teste vigia o codigo da aplicacao, onde caminho absoluto e defeito de fato.
IGNORED_PARTS = {".git", ".venv", "node_modules", "__pycache__", "tmp", ".vscode", "entregas"}
# Arquivos em que o caminho absoluto e o proprio conteudo, e nao um vazamento:
# o script que fala com a VM, a doc que a descreve e registros/artefatos que
# gravaram o diretorio da maquina que os gerou. Nenhum e codigo de aplicacao.
INTENTIONAL_FIXTURES = {
    Path("tests/test_path_policy.py"),
    Path("scripts/deploy-vm.ps1"),
    Path("README.md"),
    Path("documentacao/hierarquizacao/DIAGNOSTICO_DADOS_FAVORABILIDADE_REDE.md"),
    Path("data/geoespacial/relatorios/inventario_fontes_brutas_fase1.json"),
    # Estes dois passam um caminho absoluto de proposito, para provar que a
    # politica de caminhos o recusa. E o caso de teste, nao um vazamento.
    Path("tests/test_catalogo_arquivos.py"),
    Path("tests/test_visualizacao_arquivo.py"),
    # Metadados baixados do IPEA; o link em UNC esta no conteudo de origem.
    Path("plugins/censo2022_sp/socioeconomico_desenvolvimento/fontes/ipeadata_metadados.json"),
    # Permissoes locais do Claude Code: ignorado pelo Git, nunca chega a VM e e
    # preso a maquina de quem edita, como .vscode/. As barras invertidas
    # dobradas que o JSON exige imitam um caminho UNC para a expressao regular.
    Path(".claude/settings.local.json"),
    # Documentos que descrevem a VM e o contêiner: o caminho absoluto é o
    # assunto do texto, como no README.md.
    Path("CONTINUAR_SICARD.md"),
    Path("documentacao/geoespacial/AUDITORIA_EXTRACAO_ATRIBUTOS.md"),
    # Ferramentas que rodam só no Windows de quem edita: a extensão de editor
    # usa os diretórios padrão do sistema como reserva quando falta a variável
    # de ambiente, e o script registra a VM no Explorador Remoto com o caminho
    # da chave privada daquela máquina como valor padrão. Fazem o mesmo papel do
    # deploy-vm.ps1, listado acima.
    Path("tools/vscode-sicard-tunnel/extension.js"),
    Path("scripts/configure-vm-remote-explorer.ps1"),
}
# Bundles minificados de terceiros ou gerados por build. Escapes como Ö
# imitam um caminho UNC para a expressao regular, e nenhum deles e codigo desta
# aplicacao — e o mesmo motivo pelo qual assets/vendor ja estava de fora.
VENDORED_ROOTS = (
    Path("assets/vendor"),
    Path("geoespacial/extracao-atributos/municipal-plugin"),
    Path("plugins/municipal-layer/demo-dist"),
)


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
