// PasssoBemSolto/public/jogo.js
const partyContainer = document.getElementById('party-container');
const acoesContainer = document.getElementById('acoes');
const logCombate = document.getElementById('log-combate');
const titulo = document.querySelector('h1');
const recrutamentoModal = document.getElementById('recrutamento-modal');
const opcoesRecrutamento = document.getElementById('opcoes-recrutamento');
const diceContainer = document.getElementById('dice-animation-container');
const dice = document.getElementById('dice');
const diceResultText = document.getElementById('dice-result-text');
const inventoryModal = document.getElementById('inventory-modal');
const btnOpenInventory = document.getElementById('btn-open-inventory');
const btnCloseInventory = document.getElementById('btn-close-inventory');
const partyManagementPanel = document.getElementById('party-management-panel');
const inventoryPanel = document.getElementById('inventory-panel');
const inventoryList = document.getElementById('inventory-list');

let estadoGlobal = {};
let itemParaAtribuir = null;
let acaoPendente = null;

function mostrarAnimacaoDado(resultado, isCritico) {
    return new Promise(resolve => {
        const diceElement = document.getElementById('dice');
        if (!diceElement) {
            console.error("Elemento 'dice' não encontrado!");
            resolve();
            return;
        }
        diceElement.className = '';
        void diceElement.offsetWidth;
        diceElement.classList.add('rolling');
        diceResultText.textContent = '';
        diceContainer.classList.remove('hidden');
        setTimeout(() => {
            diceElement.classList.remove('rolling');
            diceElement.classList.add(`show-${resultado}`);
            diceResultText.textContent = isCritico ? 'CRÍTICO!' : `Rolou ${resultado}!`;
            setTimeout(() => {
                diceContainer.classList.add('hidden');
                resolve();
            }, 1200);
        }, 1000);
    });
}

function playAnimation(targetElement, animationClass) {
    if (targetElement) {
        targetElement.classList.add(animationClass);
        targetElement.addEventListener('animationend', () => {
            targetElement.classList.remove(animationClass);
        }, { once: true });
    }
}


function criarCardPersonagem(personagem, index, turnoAtual) {
    const isTurnoAtivo = index === turnoAtual;
    const card = document.createElement('div');
    card.className = `personagem-card ${isTurnoAtivo ? 'turno-ativo' : ''}`;
    card.id = `personagem-${index}`;
    const pontosDeAtributoDisponiveis = personagem.pontosDeAtributo > 0;

    // --- Lógica de Ícones de Status (MANTIDA) ---
    let statusIconsHTML = '';
    if (personagem.statusEffects) {
        Object.entries(personagem.statusEffects).forEach(([key, effect]) => {
            if (effect.duracao > 0) {
                const iconMap = {
                    buff_dano: { icon: '⚔️', text: `Dano aumentado por ${effect.duracao} turnos.` },
                    buff_ofensivo: { icon: '🔥', text: `Ofensiva aumentada por ${effect.duracao} turnos.` }
                };
                if (iconMap[key]) {
                    statusIconsHTML += `<div class="status-effect-icon" data-tooltip="${iconMap[key].text}">${iconMap[key].icon}</div>`;
                }
            }
        });
    }

    // --- Lógica de Botões de Postura (MANTIDA) ---
    const posturas = ['Agressivo', 'Tatico', 'Defensivo'];
    const posturaButtonsHTML = posturas.map(p =>
        `<button class="btn-postura ${personagem.postura === p ? 'ativo' : ''}" data-postura="${p}" data-index="${index}">${p.charAt(0)}</button>`
    ).join('');
    
    // --- Caminho da imagem (NOVO) ---
    const imagePath = `url('images/${personagem.nome}.png')`;

    // --- ESTRUTURA HTML (NOVA, mas com todo o conteúdo antigo integrado) ---
    card.innerHTML = `
        <div class="status-effects-container">${statusIconsHTML}</div>
        <div class="personagem-imagem" style="background-image: ${imagePath}"></div>
        <div class="personagem-card-conteudo">
            <h2>${personagem.nome}</h2>
            <div class="barra-vida-container"><div class="barra-vida" style="width: ${(personagem.pontosDeVida.atual / personagem.pontosDeVida.max) * 100}%"></div></div>
            <p>HP: ${personagem.pontosDeVida.atual} / ${personagem.pontosDeVida.max}</p>
            <div class="barra-xp-container"><div class="barra-xp" style="width: ${(personagem.xp / personagem.xpParaProximoNivel) * 100}%"></div></div>
            <p>XP: ${personagem.xp} / ${personagem.xpParaProximoNivel}</p>
            
            <div class="postura-container">${posturaButtonsHTML}</div>

            <div class="aliado-atributos">
                <p>Nível: <span>${personagem.nivel}</span> | Pontos: <span>${personagem.pontosDeAtributo}</span></p>
                <ul>
                    <li>Força: <span>${getStatsComEquipamento(personagem).forca}</span> <button class="btn-stat" data-stat="forca" data-index="${index}" ${!pontosDeAtributoDisponiveis ? 'disabled' : ''}>+</button></li>
                    <li>Destreza: <span>${getStatsComEquipamento(personagem).destreza}</span> <button class="btn-stat" data-stat="destreza" data-index="${index}" ${!pontosDeAtributoDisponiveis ? 'disabled' : ''}>+</button></li>
                    <li>Constituição: <span>${getStatsComEquipamento(personagem).constituicao}</span> <button class="btn-stat" data-stat="constituicao" data-index="${index}" ${!pontosDeAtributoDisponiveis ? 'disabled' : ''}>+</button></li>
                </ul>
            </div>
        </div>
    `;
    return card;
}

function atualizarTela(estado) {
    estadoGlobal = estado;
    // A desestruturação pode falhar se o estado estiver vazio. Usamos valores padrão.
    const { party = [], inimigos, log, vitoria, derrota, nivelAtual, totalNiveis, turnoPersonagemAtual, recrutamentoPendente, opcoesRecrutamento } = estado;
    
    titulo.innerText = `Hamasa Hamikrai - Nível ${nivelAtual || 1} / ${totalNiveis || '??'}`;

    const arenaContainer = document.getElementById('arena');
    const oldInimigoContainer = document.getElementById('inimigo-container');
    if (oldInimigoContainer) oldInimigoContainer.remove();

    partyContainer.innerHTML = '';
    // A verificação 'if (party)' previne o erro quando o jogador é derrotado.
    if (party) {
        party.forEach((membro, index) => { 
            partyContainer.appendChild(criarCardPersonagem(membro, index, turnoPersonagemAtual)); 
        });
    }

    if (vitoria || derrota) {
        // Desabilita os botões e prepara para finalizar o jogo
        acoesContainer.innerHTML = '<p>Calculando pontuação...</p>';
        btnOpenInventory.disabled = true;
        titulo.innerText = vitoria ? "Você Venceu a Arena!" : "Você foi Derrotado!";
    
        // Adiciona um pequeno atraso para o jogador ver a mensagem final
        setTimeout(finalizarJogo, 2000); 
        // Retorna aqui para não processar o resto da função em caso de fim de jogo
        return;
    } 

    // --- BLOCO DOS INIMIGOS CORRIGIDO ---
    if (inimigos && inimigos.length > 0) {
        const inimigoContainer = document.createElement('div');
        inimigoContainer.id = 'inimigo-container';
        inimigos.forEach((inimigo) => {
            const inimigoCard = document.createElement('div');
            inimigoCard.className = 'personagem-card inimigo-card'; // Garante as classes corretas
            inimigoCard.id = `inimigo-${inimigo.instanciaId}`;
            inimigoCard.dataset.id = inimigo.instanciaId; 

            // Caminho da imagem para o inimigo
            const imagePath = `url('images/${inimigo.nome}.png')`;

            // Lógica de Ícones de Status para Inimigos (mantida)
            let statusInimigoHTML = '';
            if (inimigo.statusEffects) {
                Object.entries(inimigo.statusEffects).forEach(([key, effect]) => {
                    if (effect.duracao > 0) {
                        const iconMap = {
                            debuff_defesa: { icon: '🛡️', text: `Defesa reduzida por ${effect.duracao} turnos.` }
                        };
                        if (iconMap[key]) {
                            statusInimigoHTML += `<div class="status-effect-icon" data-tooltip="${iconMap[key].text}">${iconMap[key].icon}</div>`;
                        }
                    }
                });
            }

            // INNERHTML CORRIGIDO: Adiciona a div da imagem
            inimigoCard.innerHTML = `
                <div class="status-effects-container">${statusInimigoHTML}</div>
                <div class="personagem-imagem" style="background-image: ${imagePath}"></div>
                <div class="personagem-card-conteudo">
                    <h2>${inimigo.nome}</h2>
                    <div class="barra-vida-container"><div class="barra-vida" style="width: ${(inimigo.pontosDeVida.atual / inimigo.pontosDeVida.max) * 100}%"></div></div>
                    <p>HP: ${inimigo.pontosDeVida.atual} / ${inimigo.pontosDeVida.max}</p>
                </div>
            `;
            inimigoContainer.appendChild(inimigoCard);
        });
        arenaContainer.appendChild(inimigoContainer);
    }
    
    if (log) {
        logCombate.innerHTML = '';
        log.forEach(mensagem => { logCombate.innerHTML += `<p>${mensagem}</p>`; });
        logCombate.scrollTop = logCombate.scrollHeight;
    }

    acoesContainer.innerHTML = '';
    btnOpenInventory.disabled = vitoria || derrota || recrutamentoPendente;

    if (recrutamentoPendente) {
        mostrarTelaRecrutamento(opcoesRecrutamento);
    } else if (party && party.length > 0) {
        const personagemDaVez = party[turnoPersonagemAtual];
        if (personagemDaVez) {
            const podeAgir = personagemDaVez.pontosDeAtributo === 0;
            const descricaoHabilidade = personagemDaVez.habilidade.descricao || "Ataque especial.";
            acoesContainer.innerHTML = `
                <button class="btn-acao" data-acao="atacar" ${!podeAgir ? 'disabled' : ''}>Atacar</button>
                <button class="btn-acao" data-acao="habilidade" 
                        data-tooltip="${descricaoHabilidade}"
                        ${!podeAgir || personagemDaVez.habilidade.cooldownAtual > 0 ? 'disabled' : ''}>
                    ${personagemDaVez.habilidade.nome} ${personagemDaVez.habilidade.cooldownAtual > 0 ? `(${personagemDaVez.habilidade.cooldownAtual})` : ''}
                </button>`;
        }
    }
    adicionarListenersAcoes();
}

async function finalizarJogo() {
    try {
        const response = await fetch('/api/jogo/finalizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: estadoGlobal.score }), // Supondo que a pontuação esteja no estado
        });
        const result = await response.json();
        if (response.ok && result.redirectTo) {
            window.location.href = result.redirectTo;
        } else {
            throw new Error(result.mensagem || 'Não foi possível salvar a pontuação.');
        }
    } catch (error) {
        console.error('Erro ao finalizar o jogo:', error);
        logCombate.innerHTML += `<p style="color: #ff5555;">Erro: ${error.message}</p>`;
        // Oferece uma opção para tentar novamente ou ir para a dashboard
        acoesContainer.innerHTML = '<button onclick="window.location.href=\'/dashboard.html\'">Ver Placar</button>';
    }
}

function mostrarTelaRecrutamento(opcoes) {
    opcoesRecrutamento.innerHTML = '';
    opcoes.forEach(aliado => {
        opcoesRecrutamento.innerHTML += `
            <div class="recruta-card">
                <h3>${aliado.nome}</h3>
                <p>Classe: ${aliado.classe}</p>
                <ul>
                    <li>For: ${aliado.atributos.forca} | Des: ${aliado.atributos.destreza} | Con: ${aliado.atributos.constituicao}</li>
                </ul>
                <p><strong>Habilidade:</strong> ${aliado.habilidade_nome}</p>
                <p class="habilidade-descricao"><em>"${aliado.habilidade_descricao}"</em></p>
                <button class="btn-recrutar" data-id="${aliado.id}">Recrutar</button>
            </div>
        `;
    });
    recrutamentoModal.classList.remove('hidden');
    document.querySelectorAll('.btn-recrutar').forEach(btn => btn.addEventListener('click', recrutarAliado));
}

function entrarModoSelecaoAlvo(acao) {
    acaoPendente = acao;
    logCombate.innerHTML += `<p style="color: yellow;">Selecione um alvo!</p>`;
    logCombate.scrollTop = logCombate.scrollHeight;
    document.querySelectorAll('.inimigo-card').forEach(card => {
        // Apenas inimigos com vida se tornam selecionáveis
        const inimigoId = parseInt(card.dataset.id);
        const inimigoData = estadoGlobal.inimigos.find(i => i.instanciaId === inimigoId);
        if (inimigoData && inimigoData.pontosDeVida.atual > 0) {
            card.classList.add('alvo-selecionavel');
            card.addEventListener('click', executarAcaoComAlvo, { once: true });
        }
    });
}

async function realizarAcao(event) {
    const acao = event.target.dataset.acao;
    if (!acao) return;

    const inimigosVivos = estadoGlobal.inimigos.filter(i => i.pontosDeVida.atual > 0);
    if (inimigosVivos.length > 1) {
        entrarModoSelecaoAlvo(acao);
        return;
    }
    
    // --- CORREÇÃO DO BUG ---
    // Se só há um inimigo vivo, pega o ID dele diretamente do estado do jogo.
    if (inimigosVivos.length === 1) {
        const unicoAlvoId = inimigosVivos[0].instanciaId;
        const unicoAlvoCard = document.getElementById(`inimigo-${unicoAlvoId}`);
        if (unicoAlvoCard) {
            executarAcaoComAlvo({ currentTarget: unicoAlvoCard }, acao);
        }
    }
}

async function executarAcaoComAlvo(event, acaoDireta) {
    const alvoId = parseInt(event.currentTarget.dataset.id);
    const acao = acaoPendente || acaoDireta;
    acaoPendente = null;

    document.querySelectorAll('.inimigo-card.alvo-selecionavel').forEach(card => {
        card.classList.remove('alvo-selecionavel');
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
    });

    acoesContainer.querySelectorAll('.btn-acao').forEach(btn => btn.disabled = true);
    const personagemAtacante = estadoGlobal.party[estadoGlobal.turnoPersonagemAtual];
    const atacanteCard = document.getElementById(`personagem-${estadoGlobal.turnoPersonagemAtual}`);

    try {
        if (acao === 'habilidade') {
            switch (personagemAtacante.habilidade.tipo) {
                case 'DANO': case 'BUFF_DANO': case 'DOT_DANO':
                    playAnimation(atacanteCard, 'power-glow-animation');
                    break;
                case 'CURA_GRUPO':
                    document.querySelectorAll('#party-container .personagem-card').forEach(card => playAnimation(card, 'heal-glow-animation'));
                    break;
            }
            await new Promise(r => setTimeout(r, 800));
        }

        const response = await fetch('/api/combate/acao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                acao,
                inimigos: estadoGlobal.inimigos,
                personagemIndex: estadoGlobal.turnoPersonagemAtual,
                alvoInimigoIndex: alvoId
            }),
        });

        const novoEstado = await response.json();
        if (!response.ok) throw new Error(novoEstado.mensagem);

        // CORREÇÃO: Verifica se 'resultadoDado' não é nulo antes de mostrar a animação do dado.
        if (novoEstado.ataqueInfo && novoEstado.ataqueInfo.resultadoDado) {
            playAnimation(atacanteCard, 'attack-animation');
            await mostrarAnimacaoDado(novoEstado.ataqueInfo.resultadoDado, novoEstado.ataqueInfo.isCritico);
            const inimigoAlvoCard = document.getElementById(`inimigo-${novoEstado.ataqueInfo.alvoIndex}`);
            if (inimigoAlvoCard) playAnimation(inimigoAlvoCard, 'hit-animation');
        }
        
        if (novoEstado.ataquesInimigosInfo && novoEstado.ataquesInimigosInfo.length > 0) {
             for(const info of novoEstado.ataquesInimigosInfo) {
                // CORREÇÃO: Verifica também aqui se há um resultado de dado.
                if (info.resultadoDado) {
                    const atacanteInimigoCard = document.getElementById(`inimigo-${info.atacanteInstanciaId}`);
                    const alvoHeroiCard = document.getElementById(`personagem-${info.alvoIndex}`);
                    if (atacanteInimigoCard) playAnimation(atacanteInimigoCard, 'attack-animation');
                    await new Promise(r => setTimeout(r, 400));
                    await mostrarAnimacaoDado(info.resultadoDado, info.isCritico);
                    if (alvoHeroiCard) playAnimation(alvoHeroiCard, 'hit-animation');
                    await new Promise(r => setTimeout(r, 400));
                }
             }
        }
        
        const isVitoriaDeNivel = novoEstado.log.some(msg => msg.includes('Inimigos derrotados!'));
        if (isVitoriaDeNivel) {
            await new Promise(r => setTimeout(r, 1000));
        }

        atualizarTela(novoEstado);

    } catch (error) {
        logCombate.innerHTML += `<p style="color: #ff5555;">Erro: ${error.message}</p>`;
        acoesContainer.querySelectorAll('.btn-acao').forEach(btn => btn.disabled = false);
    }
}

function getStatsComEquipamento(personagem) {
    if (!personagem.equipamento) return personagem.atributos;
    const statsBase = { ...personagem.atributos };
    Object.values(personagem.equipamento).forEach(item => {
        if (!item) return;
        if (item.efeito_tipo === 'BUFF_FORCA') statsBase.forca += item.efeito_valor;
        if (item.efeito_tipo === 'BUFF_DESTREZA') statsBase.destreza += item.efeito_valor;
        if (item.efeito_tipo === 'BUFF_CONSTITUICAO') statsBase.constituicao += item.efeito_valor;
    });
    return statsBase;
}

function renderInventory() {
    itemParaAtribuir = null;
    const { party, inventario } = estadoGlobal;
    partyManagementPanel.innerHTML = party.map((p, index) => renderCharacterSheet(p, index)).join('');
    inventoryPanel.querySelector('h3').textContent = "Inventário";
    inventoryList.innerHTML = renderInventoryList(inventario);

    document.querySelectorAll('.btn-stat-inv').forEach(btn => btn.addEventListener('click', distribuirPontoInv));
    document.querySelectorAll('.btn-use-item, .btn-equip-item').forEach(btn => btn.addEventListener('click', selecionarAlvoParaItem));
    document.querySelectorAll('.btn-unequip-item').forEach(btn => btn.addEventListener('click', desequiparItem));
}

function renderCharacterSheet(personagem, index) {
    const statsComEquip = getStatsComEquipamento(personagem);
    
    const criarHtmlAtributo = (nomeAtributo) => {
        const base = personagem.atributos[nomeAtributo];
        const comEquip = statsComEquip[nomeAtributo];
        const bonus = comEquip - base;
        const bonusHtml = bonus > 0 ? ` <span class="stat-bonus">(+${bonus})</span>` : '';
        return `<span>${comEquip}${bonusHtml}</span>`;
    };

    const criarSlotEquipamento = (slot, nomeItem) => `
        <div class="equipment-slot">
            <div class="slot-header">
                <div class="slot-name">${slot.charAt(0).toUpperCase() + slot.slice(1)}</div>
                ${nomeItem !== 'Vazio' ? `<button class="btn-unequip-item" data-slot="${slot}" data-index="${index}">X</button>` : ''}
            </div>
            <div class="item-name">${nomeItem}</div>
        </div>
    `;

    return `
    <div class="character-sheet" data-index="${index}">
        <div class="sheet-header"><h3>${personagem.nome} (Nível ${personagem.nivel})</h3> <span>Pontos: ${personagem.pontosDeAtributo}</span></div>
        <div class="sheet-stats">
            <div class="stat-item"><span>HP:</span> <span>${personagem.pontosDeVida.atual}/${personagem.pontosDeVida.max}</span></div>
            <div class="stat-item"><span>Força:</span> ${criarHtmlAtributo('forca')} <button class="btn-stat-inv" data-stat="forca" data-index="${index}" ${personagem.pontosDeAtributo <= 0 ? 'disabled' : ''}>+</button></div>
            <div class="stat-item"><span>Destreza:</span> ${criarHtmlAtributo('destreza')} <button class="btn-stat-inv" data-stat="destreza" data-index="${index}" ${personagem.pontosDeAtributo <= 0 ? 'disabled' : ''}>+</button></div>
            <div class="stat-item"><span>Constituição:</span> ${criarHtmlAtributo('constituicao')} <button class="btn-stat-inv" data-stat="constituicao" data-index="${index}" ${personagem.pontosDeAtributo <= 0 ? 'disabled' : ''}>+</button></div>
        </div>
        <div class="sheet-equipment">
            ${criarSlotEquipamento('universal', personagem.equipamento.universal?.nome || 'Vazio')}
            ${criarSlotEquipamento('classe', personagem.equipamento.classe?.nome || 'Vazio')}
        </div>
    </div>`;
}

function renderInventoryList(inventario) {
    const formatarEfeito = (item) => {
        switch(item.efeito_tipo) {
            case 'CURA_PERCENTUAL': return `Cura ${item.efeito_valor * 100}% da vida máx.`;
            case 'LEVEL_UP': return `Sobe 1 nível.`;
            case 'BUFF_FORCA': return `+${item.efeito_valor} Força`;
            case 'BUFF_DESTREZA': return `+${item.efeito_valor} Destreza`;
            case 'BUFF_CONSTITUICAO': return `+${item.efeito_valor} Constituição`;
            default: return 'Efeito desconhecido';
        }
    };

    const pocoesHTML = inventario.pocoes.map(p => `
        <div class="inventory-item rarity-${p.raridade.toLowerCase()}">
            <div><span class="item-name">${p.nome} (x${p.quantidade})</span><p class="item-effect">${formatarEfeito(p)}</p></div>
            <div class="item-actions"><button class="btn-use-item" data-item-id="${p.id}" data-action-type="usar">Usar</button></div>
        </div>`).join('');
    
    const equipamentosHTML = inventario.equipamentos.map(e => `
        <div class="inventory-item rarity-${e.raridade.toLowerCase()}">
             <div><span class="item-name">${e.nome}</span><p class="item-effect">${formatarEfeito(e)} ${e.classe_restrita ? `(${e.classe_restrita})` : ''}</p></div>
            <div class="item-actions"><button class="btn-equip-item" data-item-id="${e.id}" data-action-type="equipar">Equipar</button></div>
        </div>`).join('');
        
    return pocoesHTML + equipamentosHTML || '<p>O inventário está vazio.</p>';
}

function selecionarAlvoParaItem(event) {
    const button = event.currentTarget;
    const itemId = parseInt(button.dataset.itemId);
    const actionType = button.dataset.actionType;
    itemParaAtribuir = { itemId, actionType };
    inventoryPanel.querySelector('h3').textContent = `Selecione um personagem para ${actionType} o item.`;
    document.querySelectorAll('.character-sheet').forEach(sheet => {
        sheet.classList.add('character-selectable');
        sheet.addEventListener('click', aplicarItemNoAlvo);
    });
}

async function aplicarItemNoAlvo(event) {
    if (!itemParaAtribuir) return;
    const sheet = event.currentTarget;
    const personagemIndex = parseInt(sheet.dataset.index);
    const { itemId, actionType } = itemParaAtribuir;
    const endpoint = `/api/inventario/${actionType}`;
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personagemIndex, itemId }),
        });
        const novoEstado = await response.json();
        if (!response.ok) throw new Error(novoEstado.mensagem);
        estadoGlobal.party = novoEstado.party;
        estadoGlobal.inventario = novoEstado.inventario;
        renderInventory();
    } catch (err) {
        alert(`Erro: ${err.message}`);
    } finally {
        itemParaAtribuir = null;
        document.querySelectorAll('.character-sheet').forEach(sheet => {
            sheet.classList.remove('character-selectable');
            sheet.removeEventListener('click', aplicarItemNoAlvo);
        });
        inventoryPanel.querySelector('h3').textContent = "Inventário";
    }
}

async function desequiparItem(event) {
    const button = event.currentTarget;
    const personagemIndex = parseInt(button.dataset.index);
    const slot = button.dataset.slot;
    try {
        const response = await fetch('/api/inventario/desequipar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personagemIndex, slot }),
        });
        const novoEstado = await response.json();
        if (!response.ok) throw new Error(novoEstado.mensagem);
        
        estadoGlobal.party = novoEstado.party;
        estadoGlobal.inventario = novoEstado.inventario;
        renderInventory();
    } catch (err) {
        alert(`Erro: ${err.message}`);
    }
}

async function recrutarAliado(event) {
    const idAliado = event.target.dataset.id;
    recrutamentoModal.classList.add('hidden');
    const response = await fetch('/api/jogo/recrutar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idAliado }), });
    const novoEstado = await response.json();
    atualizarTela(novoEstado);
}

async function distribuirPontoInv(event) {
    event.stopPropagation();
    const atributo = event.target.dataset.stat;
    const personagemIndex = parseInt(event.target.dataset.index);
    const response = await fetch('/api/heroi/distribuir-atributo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atributo, personagemIndex }),
    });
    const { party } = await response.json();
    estadoGlobal.party = party;
    renderInventory();
}

btnOpenInventory.addEventListener('click', () => { 
    renderInventory(); 
    inventoryModal.classList.remove('hidden'); 
});

btnCloseInventory.addEventListener('click', () => {
    if(itemParaAtribuir) {
        itemParaAtribuir = null;
        document.querySelectorAll('.character-sheet').forEach(sheet => {
            sheet.classList.remove('character-selectable');
            sheet.removeEventListener('click', aplicarItemNoAlvo);
        });
    }
    inventoryModal.classList.add('hidden');
    atualizarTela(estadoGlobal);
});

async function mudarPostura(event) {
    const personagemIndex = parseInt(event.target.dataset.index);
    const novaPostura = event.target.dataset.postura;

    try {
        const response = await fetch('/api/heroi/mudar-postura', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personagemIndex, novaPostura }),
        });
        const novoEstado = await response.json();
        if (!response.ok) throw new Error(novoEstado.mensagem);
        estadoGlobal.party = novoEstado.party;
        atualizarTela(estadoGlobal);
    } catch (error) {
        logCombate.innerHTML += `<p style="color: #ff5555;">Erro: ${error.message}</p>`;
    }
}

function adicionarListenersAcoes() {
    acoesContainer.addEventListener('click', realizarAcao);
    document.querySelectorAll('.btn-stat').forEach(btn => { btn.addEventListener('click', distribuirPontoMain); });
    document.querySelectorAll('.btn-postura').forEach(btn => { btn.addEventListener('click', mudarPostura); }); // Adicione esta linha
}

async function distribuirPontoMain(event) {
    const atributo = event.target.dataset.stat;
    const personagemIndex = parseInt(event.target.dataset.index);
    const response = await fetch('/api/heroi/distribuir-atributo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atributo, personagemIndex }),
    });
    const { party } = await response.json();
    estadoGlobal.party = party;
    atualizarTela(estadoGlobal);
}

async function iniciarJogo() {
    const response = await fetch('/api/jogo/iniciar');
    const estadoInicial = await response.json();
    if (!response.ok) { logCombate.innerHTML = `<p>Erro: ${estadoInicial.mensagem}</p>`; return; }
    estadoInicial.score = 0;
    atualizarTela(estadoInicial);
}
document.getElementById('btn-iniciar').addEventListener('click', iniciarJogo);