"use strict";

const vscode = require("vscode");
const http = require("http");
const https = require("https");
const path = require("path");

const STATIC_ROUTES = new Map([
  ["paginas/index.html", "/public/"],
  ["paginas/painel/index.html", "/public/painel/"],
  ["paginas/documentacao/index.html", "/public/documentacao/"],
  ["paginas/transparencia/index.html", "/public/transparencia/"],
  ["paginas/admin/login.html", "/public/login/"],
  ["paginas/admin/index.html", "/restrict/"],
  ["paginas/admin/operador.html", "/restrict/"],
  ["paginas/admin/area-administrador.html", "/restrict/admin/"],
  ["paginas/admin/painel.html", "/restrict/painel/"],
  ["paginas/admin/demandas.html", "/restrict/demandas/"],
  ["paginas/admin/analise_demanda.html", "/restrict/demanda/"],
  ["paginas/admin/revisao-status.html", "/restrict/revisao-status/"],
  ["paginas/admin/complementacao.html", "/restrict/complementacao/"],
  ["paginas/hierarquizacao/home.html", "/restrict/hierarquizacao/processos/"],
  ["paginas/hierarquizacao/apresentacao-processo-hierarquizacao.html", "/restrict/hierarquizacao/metodologia/"],
  ["paginas/hierarquizacao/fase1-elegibilidade.html", "/restrict/hierarquizacao/fase-1/"],
  ["paginas/hierarquizacao/fase2-favorabilidade.html", "/restrict/hierarquizacao/fase-2/"],
  ["paginas/hierarquizacao/fase3-ajuste-fino.html", "/restrict/hierarquizacao/fase-3/"],
  ["paginas/hierarquizacao/ranking-privado.html", "/restrict/hierarquizacao/ranking/"],
  ["paginas/analise_multicriterio/formulario.html", "/public/analise-multicriterio/token-de-teste/"],
  ["paginas/geoespacial/index.html", "/restrict/geoespacial/"]
]);

function workspaceFor(uri) {
  return vscode.workspace.getWorkspaceFolder(uri) || vscode.workspace.workspaceFolders?.[0];
}

function templateKey(uri, workspace) {
  const templatesRoot = path.join(workspace.uri.fsPath, "templates");
  const relative = path.relative(templatesRoot, uri.fsPath).replace(/\\/g, "/");
  return relative.startsWith("../") ? null : relative;
}

function routeFor(key) {
  if (!key) return null;
  if (STATIC_ROUTES.has(key)) return STATIC_ROUTES.get(key);
  let match = key.match(/^paginas\/cadastro\/(.+)\.html$/);
  if (match && match[1] !== "index") return `/public/cadastro/${match[1]}/`;
  match = key.match(/^paginas\/geoespacial\/(.+)\.html$/);
  if (match) return `/restrict/geoespacial/${match[1]}/`;
  return null;
}

function requestOk(url) {
  return new Promise((resolve) => {
    const client = url.startsWith("https:") ? https : http;
    const request = client.get(url, { timeout: 2500 }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });
    request.on("timeout", () => { request.destroy(); resolve(false); });
    request.on("error", () => resolve(false));
  });
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function startServer(workspace) {
  const config = vscode.workspace.getConfiguration("sicardPreview", workspace.uri);
  const taskName = config.get("startTask", "SICARD: Iniciar servidor local");
  const tasks = await vscode.tasks.fetchTasks();
  const task = tasks.find((candidate) => candidate.name === taskName);
  if (!task) throw new Error(`Tarefa não encontrada: ${taskName}`);
  await vscode.tasks.executeTask(task);
}

async function waitForServer(baseUrl, timeoutSeconds) {
  const healthUrl = `${baseUrl.replace(/\/$/, "")}/api/health`;
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    if (await requestOk(healthUrl)) return true;
    await delay(1000);
  }
  return false;
}

async function openCurrentTemplate(resource) {
  const uri = resource || vscode.window.activeTextEditor?.document.uri;
  if (!uri || uri.scheme !== "file") {
    vscode.window.showErrorMessage("Abra um template HTML do SICARD antes de executar o comando.");
    return;
  }
  const workspace = workspaceFor(uri);
  if (!workspace) {
    vscode.window.showErrorMessage("O template não pertence a um workspace aberto.");
    return;
  }
  const key = templateKey(uri, workspace);
  const route = routeFor(key);
  if (!route) {
    vscode.window.showErrorMessage(`Não foi possível identificar uma rota de página para ${key || uri.fsPath}. Bases e componentes não possuem URL própria.`);
    return;
  }

  const config = vscode.workspace.getConfiguration("sicardPreview", workspace.uri);
  const baseUrl = config.get("baseUrl", "http://127.0.0.1:8080").replace(/\/$/, "");
  const timeout = config.get("startTimeoutSeconds", 120);
  const healthUrl = `${baseUrl}/api/health`;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "SICARD: preparando visualização local", cancellable: false },
    async (progress) => {
      if (!(await requestOk(healthUrl))) {
        progress.report({ message: "iniciando o servidor…" });
        await startServer(workspace);
        progress.report({ message: "aguardando o servidor responder…" });
        if (!(await waitForServer(baseUrl, timeout))) {
          throw new Error(`O servidor não respondeu em ${timeout} segundos. Consulte o terminal da tarefa SICARD.`);
        }
      }
      progress.report({ message: "abrindo a página…" });
      await vscode.commands.executeCommand("simpleBrowser.show", `${baseUrl}${route}`);
    }
  );
}

async function refreshSourceControl() {
  try {
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension) throw new Error("Extensão Git do VS Code indisponível.");
    const git = await gitExtension.activate();
    const api = git.getAPI(1);
    const folders = (vscode.workspace.workspaceFolders || []).map((folder) =>
      path.resolve(folder.uri.fsPath).toLowerCase()
    );
    const repositories = api.repositories.filter((repository) => {
      const root = path.resolve(repository.rootUri.fsPath).toLowerCase();
      return folders.some((folder) => root === folder || root.startsWith(`${folder}${path.sep}`));
    });
    if (!repositories.length) {
      vscode.window.showWarningMessage("SICARD: nenhum repositório Git aberto para atualizar.");
      return "sem-repositorios";
    }
    await Promise.all(repositories.map((repository) => repository.status()));
    vscode.window.showInformationMessage(
      `SICARD: Source Control atualizado (${repositories.length} repositório(s)).`
    );
    return "source-control-atualizado";
  } catch (error) {
    vscode.window.showWarningMessage(`SICARD: não foi possível atualizar o Source Control: ${error.message}`);
    return "source-control-indisponivel";
  }
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("sicardPreview.openCurrentTemplate", (resource) =>
      openCurrentTemplate(resource).catch((error) => vscode.window.showErrorMessage(`SICARD Preview: ${error.message}`))
    ),
    vscode.commands.registerCommand("sicardPreview.refreshSourceControl", refreshSourceControl
    )
  );
}

function deactivate() {}

module.exports = { activate, deactivate, routeFor, templateKey };