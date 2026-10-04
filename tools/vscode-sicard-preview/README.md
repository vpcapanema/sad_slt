# SICARD Template Preview

Extensão local para abrir, no navegador embutido do VS Code, a rota FastAPI correspondente ao template Jinja do SICARD.

## Uso

1. Inicie `SICARD: Iniciar servidor local` (uma vez por sessão).
2. Clique com o botão direito em um arquivo de página dentro de `templates/paginas/`.
3. Escolha **SICARD: abrir página renderizada no editor**.
4. A extensão mapeia o template para a rota e abre a página renderizada no Simple Browser do VS Code.

A extensão usa `sicardPreview.baseUrl`; neste workspace, `http://127.0.0.1:8083`. Reaproveita o servidor se `/api/health` responder. Caso contrário, executa a tarefa `SICARD: Iniciar servidor local` e espera o healthcheck antes de abrir a rota.

Templates-base e componentes não possuem rota própria e, por isso, não podem ser abertos isoladamente.