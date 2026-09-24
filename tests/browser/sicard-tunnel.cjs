const test=require('node:test');const assert=require('node:assert/strict');
const {argumentsFor,isProject,includeConfig}=require('../../tools/vscode-sicard-tunnel/tunnel');
test('ponte é somente loopback, sem shell e com falha explícita de encaminhamento',()=>{
 const args=argumentsFor('scaling-space-giggle-g46xvg6r7vx52w7jw');
 assert.equal(args.at(-1),'127.0.0.1:10022:56.125.163.194:22');
 assert.ok(args.includes('ExitOnForwardFailure=yes'));assert.ok(args.includes('BatchMode=yes'));
 assert.throws(()=>argumentsFor('x; start evil'));
});
test('somente projeto sad_slt',()=>{
 assert.ok(isProject([{uri:{path:'/workspaces/sad_slt'}}]));
 assert.ok(isProject([{uri:{path:'/c:/repos/sad_slt'}}]));
 assert.equal(isProject([{uri:{path:'/workspaces/outro'}}]),false);
});
test('include global preserva hosts existentes e é idempotente',()=>{
 const old='Host outro\n  HostName exemplo\n';const target='C:\\Users\\vinic\\.ssh\\sicard.config';
 const updated=includeConfig(old,target);assert.ok(updated.endsWith(old));
 assert.ok(updated.indexOf('Include')<updated.indexOf('Host outro'));
 assert.equal(includeConfig(updated,target),updated);
});
