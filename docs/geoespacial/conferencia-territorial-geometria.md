# Conferência territorial antes da substituição de geometria

Projeto, Programa e Plano oferecem Enviar/substituir geometria no modo Editar.
O endpoint POST /api/geometria/conferir/{tipo}/{codigo} interpreta o arquivo original sem buffer; não grava a demanda.
Confere a geometria inteira usando OGR em EPSG:5880 contra a malha municipal paulista e o recorte marítimo de referência.
Mais de um município é apresentado como lista; geometria terrestre/marítima informa ambos; em área exclusivamente marítima não inventa município.
A confirmação exige token HMAC vinculado ao hash dos bytes, usuário, tipo e código, com validade de 15 minutos.
POST /api/geometria/substituir/{tipo}/{codigo} valida o token e repete a conferência antes de processar.
Reutiliza parse_upload, normalizar e receber_arquivo_geometria do cadastro; pontos recebem raio 50 m, linhas buffer 25 m de cada lado.
OGR executa operações métricas em 5880; armazenamento em 4674, sem simplificação de geometria.
O original é preservado pelo mesmo insert_upload no Sicard Storage e no histórico; a substituição e o histórico usam a mesma transação do banco.
Registra atualizado_por do usuário da sessão e atualizado_em pelo trigger de edição, sem substituir criado_por ou responsáveis/datas das decisões.
Se a validação/processamento falhar, a geometria anterior é preservada. Edições não salvas precisam ser salvas ou canceladas antes do envio.

## Referência marítima adotada

Arquivo: data/referencias-territoriais/abrangencia-marinha-sp.geojson.
Reprodução: python -m scripts.gerar_abrangencia_marinha_sp (raiz do repositório).
A área foi estimada a partir dos pontos e azimutes RJ/SP e SP/PR publicados no Guia dos Royalties (ANP, tabela 13, p.61), também reproduzidos em documentação técnica IBGE no Diário da Assembleia Nacional Constituinte de 19/08/1988.
O recorte intersecta o Sistema Costeiro-Marinho/Amazônia Azul 2024 (IBGE) e exclui as áreas terrestres/insulares dos 27 estados obtidas pelo WFS oficial da ANP.
Não existe aviso ou bloqueio provisório de revisão marítima na interface: aplica-se essa referência operacional definida.

Trata-se de estimativa operacional autorizada para a plataforma, e não de uma nova demarcação jurídica ou download oficial de divisas marítimas estaduais.
As linhas foram aproximadas como retas cartográficas em EPSG:5880; a tabela histórica não informa datum, e suas coordenadas foram interpretadas como geográficas WGS84 para aproximação.
Essas aproximações não reproduzem exatamente as geodésicas jurídicas e não servem para royalties, demarcação ou licenciamento.
As fontes completas, pontos, azimutes e hash do recorte estão em data/referencias-territoriais/abrangencia-marinha-sp-fontes.json.
A geometria do usuário não sofre simplificação. O recorte de validação pode ser substituído por dados vetoriais oficiais mais precisos preservando o contrato dos endpoints.

## Validação

Testes de confirmação vinculada ao arquivo/sessão/alvo, expiração, adulteração e ausência de sessão.
Casos marítimos em SP, RJ e PR, caso terrestre fora do estado e geometria parcialmente externa.
Recepção do arquivo original pelos três tipos, preservação das autorias e teste de interação do modal no Edge headless.
