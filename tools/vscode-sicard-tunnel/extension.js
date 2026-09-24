'use strict';
const vscode=require('vscode');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const net=require('node:net');const {spawn,execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {argumentsFor,isProject,includeConfig,FORWARD}=require('./tunnel');
let disposeAll=()=>{};
function activate(context) {
  if(process.platform!=='win32'||vscode.env.uiKind!==vscode.UIKind.Desktop)return;
  const output=vscode.window.createOutputChannel('SICARD · Túnel do Windows');
  const event=new vscode.EventEmitter();
  const status=vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,1);
  status.command='sicardTunnel.log';
  let child=null,lease=null,timer=null,stopped=true,starting=false,disposed=false,attempt=0,phase='Parado';
  const config=()=>vscode.workspace.getConfiguration('sicardTunnel');
  const gh=()=>{const candidate=path.join(process.env.ProgramFiles||'C:\\Program Files','GitHub CLI','gh.exe');return fs.existsSync(candidate)?candidate:'gh.exe';};
  function update(message){phase=message;status.text=`$(plug) SICARD: ${message}`;status.tooltip=FORWARD;event.fire();}
  const provider={onDidChangeTreeData:event.event,getTreeItem:item=>item,getChildren:()=>[
    Object.assign(new vscode.TreeItem(phase),{description:'Windows → Codespace → VM',command:{command:'sicardTunnel.log',title:'Ver log'}}),
    Object.assign(new vscode.TreeItem('Iniciar / reconectar'),{command:{command:'sicardTunnel.start',title:'Iniciar'}}),
    Object.assign(new vscode.TreeItem('Parar túnel'),{command:{command:'sicardTunnel.stop',title:'Parar'}})
  ]};
  async function sshConfig(){
    const codespace=config().get('codespace');argumentsFor(codespace);
    const {stdout}=await promisify(execFile)(gh(),['codespace','ssh','-c',codespace,'--config'],{windowsHide:true,timeout:60000,maxBuffer:1024*1024});
    if(!/^Host\s+/m.test(stdout))throw new Error('GitHub CLI não retornou uma configuração SSH válida.');
    const dir=path.join(os.homedir(),'.ssh');fs.mkdirSync(dir,{recursive:true});
    const managed=path.join(dir,'sicard-codespace.config');
    // O encaminhamento é mantido pelo processo dedicado; abrir Remote-SSH não o duplica.
    const generated=stdout.replace(/^Host\s+[^\r\n]+/m,'Host sicard-codespace');
    fs.writeFileSync(managed,generated,'utf8');
    const target=path.join(dir,'config');const existing=fs.existsSync(target)?fs.readFileSync(target,'utf8'):'';
    const next=includeConfig(existing,managed);
    if(next!==existing){if(existing)fs.copyFileSync(target,`${target}.sicard-backup-${Date.now()}`);fs.writeFileSync(target,next,'utf8');}
    output.appendLine('Conexão sicard-codespace registrada em ~/.ssh/config para o Explorador Remoto.');
  }
  function schedule(){
    if(stopped||disposed)return;
    const delay=Math.min(60,5*2**Math.min(attempt++,4));
    output.appendLine(`Nova tentativa em ${delay}s.`);
    timer=setTimeout(()=>{timer=null;launch();},delay*1000);
  }
  function launch(){
    if(stopped||disposed||child)return;
    let args;try{args=argumentsFor(config().get('codespace'));}catch(e){output.appendLine(e.message);update('Configuração inválida');return;}
    update('Processo em execução');
    output.appendLine(`Iniciando gh codespace ssh; encaminhamento ${FORWARD}.`);
    const proc=child=spawn(gh(),args,{windowsHide:true,stdio:['ignore','pipe','pipe'],shell:false});
    const log=data=>output.append(data.toString());proc.stdout.on('data',log);proc.stderr.on('data',log);
    proc.once('error',e=>{output.appendLine(`Falha ao iniciar: ${e.message}. Confira gh auth status no PowerShell.`);});
    proc.once('close',code=>{if(child===proc)child=null;if(!stopped){update(`Desconectado (${code??'erro'})`);schedule();}});
  }
  async function start(){
    if(disposed||starting||child||lease)return;
    if(!vscode.workspace.isTrusted||!isProject(vscode.workspace.workspaceFolders))return;
    stopped=false;starting=true;status.show();
    // Exclusão entre janelas do VS Code: somente uma mantém esta ponte no Windows.
    const server=net.createServer(socket=>socket.end());
    server.once('error',e=>{starting=false;if(e.code==='EADDRINUSE'){update('Porta de controle ocupada');if(!stopped&&!disposed)timer=setTimeout(()=>{timer=null;start();},10000);}else{output.appendLine(e.message);update('Falha no controle local');}});
    server.listen(38427,'127.0.0.1',async()=>{
      if(stopped||disposed){server.close();starting=false;return;}lease=server;
      try{await sshConfig();}catch(e){output.appendLine(`Configuração do Explorador Remoto: ${e.message}`);}
      starting=false;launch();
    });
  }
  function stop(){
    stopped=true;clearTimeout(timer);timer=null;
    const proc=child;child=null;
    if(proc?.pid){
      // Encerra somente o processo que esta extensão iniciou e seus filhos ssh.
      execFile(path.join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(proc.pid),'/T','/F'],{windowsHide:true},()=>{});
    }
    if(lease){lease.close();lease=null;}
    update('Parado');
  }
  function auto(){if(isProject(vscode.workspace.workspaceFolders)){status.show();if(config().get('autoStart')&&vscode.workspace.isTrusted)start();}else{stop();status.hide();}}
  context.subscriptions.push(output,event,status,vscode.window.registerTreeDataProvider('sicardTunnel.view',provider),
    vscode.commands.registerCommand('sicardTunnel.start',()=>{attempt=0;start();}),
    vscode.commands.registerCommand('sicardTunnel.stop',stop),
    vscode.commands.registerCommand('sicardTunnel.log',()=>output.show()),
    vscode.commands.registerCommand('sicardTunnel.sshConfig',()=>sshConfig().catch(e=>vscode.window.showErrorMessage(e.message))),
    vscode.workspace.onDidChangeWorkspaceFolders(auto),vscode.workspace.onDidGrantWorkspaceTrust(auto),
    vscode.workspace.onDidChangeConfiguration(e=>{if(e.affectsConfiguration('sicardTunnel')){stop();if(config().get('autoStart'))auto();}}));
  disposeAll=()=>{disposed=true;stop();};context.subscriptions.push({dispose:disposeAll});auto();
}
exports.activate=activate;exports.deactivate=()=>disposeAll();
