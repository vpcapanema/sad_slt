'use strict';
const FORWARD='127.0.0.1:10022:56.125.163.194:22';
function argumentsFor(codespace) {
  if(!/^[a-z0-9][a-z0-9-]{1,100}$/.test(codespace))throw new Error('Nome de Codespace inválido.');
  return ['codespace','ssh','-c',codespace,'--','-T','-N','-o','BatchMode=yes',
    '-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=30','-o','ServerAliveCountMax=3','-R',FORWARD];
}
function isProject(folders) {
  return (folders||[]).some(f=>/(?:^|\/)sad_slt\/?$/i.test(f.uri.path));
}
function includeConfig(existing,include) {
  const line=`Include "${include.replace(/\\/g,'/')}"`;
  if(existing.split(/\r?\n/).some(l=>l.trim()===line))return existing;
  // Include global antes do primeiro Host/Match: não herda o escopo de outra conexão.
  return `# SICARD: conexão gerenciada pela extensão local\n${line}\n\n${existing.replace(/^\uFEFF/,'')}`;
}
module.exports={argumentsFor,isProject,includeConfig,FORWARD};
