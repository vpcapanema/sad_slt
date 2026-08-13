// Step 4 specific initialization
        document.addEventListener('DOMContentLoaded', function() {
            // Fonte canônica: a coluna Critério da matriz de critérios e premissas
            // carregada/upada nas etapas anteriores (Seleção de Critérios, Nomes),
            // não apenas o cache "ahp_criteria" (que pode ficar desatualizado).
            var inputMethod = localStorage.getItem('ahp_inputMethod') || 'manual';
            var matrizCriterios = null;
            if (inputMethod === 'upload_matriz' && window.SltMatrizPremissas) {
                var linhasMatriz = window.SltMatrizPremissas.loadMatrizPremissas();
                if (linhasMatriz && linhasMatriz.length) {
                    matrizCriterios = linhasMatriz
                        .map(function (r) { return (r && (r.criterio || r['Critério'] || r.nome)) || ''; })
                        .filter(Boolean);
                }
            }

            const savedCriteria = matrizCriterios ? JSON.stringify(matrizCriterios) : localStorage.getItem('ahp_criteria');
            const savedMethod = localStorage.getItem('ahp_chosenMethod');

            if (!savedCriteria) {
                const host = document.getElementById('comparisonContainer') || document.querySelector('.ahp-section');
                if (host) {
                    const note = document.createElement('div');
                    note.className = 'ahp-recommendation';
                    note.innerHTML = '<div class="ahp-recommendation__head"><i class="fas fa-circle-info"></i><strong>Comparação indisponível.</strong></div><p>Defina os critérios na <a href="/restrict/ahp/criterios/">Etapa 2</a> e escolha o método na <a href="/restrict/ahp/metodo/">Etapa 4</a> para realizar as comparações.</p>';
                    host.appendChild(note);
                }
                return;
            }

            criteria = JSON.parse(savedCriteria);
            if (matrizCriterios) {
                // Mantém o cache sincronizado com a matriz (fonte canônica).
                localStorage.setItem('ahp_criteria', savedCriteria);
                localStorage.setItem('ahp_criteriaCount', String(matrizCriterios.length));
            }
            const method = savedMethod;

            const methodCardTitle = document.getElementById('methodCardTitle');
            const instructionsText = document.getElementById('instructionsText');

            if (method === 'matrix') {
                instructionsText.innerHTML = '<strong>Como preencher a Matriz:</strong> Compare SEMPRE a linha com a coluna.Você pode preencher <strong>qualquer célula da matriz</strong> (exceto a diagonal principal). Ao selecionar um valor em uma célula, o sistema automaticamente ajustará a célula simétrica oposta com o valor recíproco oposto. Use a Escala de Saaty apresentada acima para suas comparações.';
                generateDirectMatrixStep4();
            } else {
                instructionsText.innerHTML = '<strong>Como preencher o Formulário:</strong> Para cada par de critérios apresentado, selecione a intensidade de importância usando a Escala de Saaty. Compare o <strong>Critério 1 com o Critério 2</strong>, indicando quanto o Critério 1 é mais ou menos importante que o Critério 2. O sistema irá processar automaticamente as comparações recíprocas.';
                generatePairwiseFormStep4();
            }
        });
