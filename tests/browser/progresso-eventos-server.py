"""Servidor isolado: worker e canal reais, sem banco nem sessão de produção."""
import socket
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
import uvicorn
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from api.services.controle_processamento import ControleProcessamento
from api.services.progresso_eventos import resposta
app=FastAPI();controle=ControleProcessamento()
app.mount('/assets',StaticFiles(directory=ROOT/'assets'),name='assets')
@app.get('/')
def index():
    return HTMLResponse('''<html><link rel="stylesheet" href="/assets/css/feedback.css"><body>
    <script src="/assets/js/feedback.js"></script><script>
    window.proc=SLTFeedback.processo('Processo de teste');
    proc.acompanhar({id:'teste',status:'executando',eventos_url:'/eventos'});
    </script></body></html>''')
@app.get('/eventos')
def eventos():return resposta(controle.eventos,'teste')
@app.post('/tarefa')
def tarefa(body:dict):
    if 'mensagem' in body:controle.mensagem(body['mensagem'])
    if 'feitas' in body:controle.tarefa(body['feitas'],body['total'])
    if 'status' in body:controle.encerrar(body['status'])
    return {'ok':True}
if __name__=='__main__':
    sock=socket.socket();sock.bind(('127.0.0.1',0));sock.listen()
    print(sock.getsockname()[1],flush=True)
    uvicorn.Server(uvicorn.Config(app,log_level='error')).run(sockets=[sock])
