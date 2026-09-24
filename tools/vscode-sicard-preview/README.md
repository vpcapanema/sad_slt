# SICARD Template Preview

Extensão local do workspace para abrir templates Jinja renderizados pelo FastAPI do SICARD, antes de commit, push ou deploy.

## Uso

1. Reinicie o VS Code após instalar a extensão.
2. Abra qualquer arquivo em `templates/paginas/`.
3. Clique com o botão direito no editor ou no Explorer.
4. Escolha **SICARD: iniciar e abrir página atual**.

A extensão usa `sicardPreview.baseUrl`: neste workspace, `http://127.0.0.1:8083`; o padrão da extensão para outros ambientes permanece 8080. Reaproveita o servidor se `/api/health` responder. Caso contrário, executa a tarefa `SICARD: Iniciar ambiente de desenvolvimento`, espera o healthcheck e abre a rota local correspondente ao template.

Templates-base e componentes não possuem rota própria e, por isso, não podem ser abertos isoladamente.