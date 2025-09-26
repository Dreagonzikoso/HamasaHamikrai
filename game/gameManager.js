// PasssoBemSolto/game/gameManager.js
const pool = require('../config/database');

let estado = {};


const calcularXpNecessario = (nivel) => 125 + (nivel - 1) * 75;
const CURA_POS_COMBATE = 20;
const COOLDOWN_HABILIDADE_BASE = 3;
const CHANCE_RECRUTAMENTO = 1 / 6;
const pesosRaridade = { 'Comum': 40, 'Incomum': 25, 'Raro': 15, 'Epico': 7, 'Lendario': 3 };
const pesoPocao = 50;
let score = 0;


function rolarDado() { return Math.floor(Math.random() * 6) + 1; }
function getMultiplicadorDoDado(resultado) { if (resultado === 6) return 1.5; return 0.9 + (resultado / 5) * 0.4; }

async function buscarInimigos(nivel) {
    const res = await pool.query('SELECT * FROM inimigos WHERE nivel <= $1 ORDER BY random() LIMIT 3', [nivel]);
    return res.rows;
}

async function buscarAliadosAleatorios(quantidade) {
    const res = await pool.query('SELECT * FROM aliados ORDER BY random() LIMIT $1', [quantidade]);
    return res.rows;
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

function calcularDano(atacante, defensor, multiplicadorBase = 1) {
    const statsAtacante = getStatsComEquipamento(atacante);
    const statsDefensor = getStatsComEquipamento(defensor);

    // Modificadores de postura
    let modificadorAtaque = 1.0;
    if (atacante.postura === 'Agressivo') {
        modificadorAtaque = 1.15;
    } else if (atacante.postura === 'Defensivo') {
        modificadorAtaque = 0.85;
    }

    let modificadorDefesa = 1.0;
    if (defensor.postura === 'Agressivo') {
        modificadorDefesa = 1.15;
    } else if (defensor.postura === 'Defensivo') {
        modificadorDefesa = 0.80;
    }

    const resultadoDado = rolarDado();
    const multiplicadorDado = getMultiplicadorDoDado(resultadoDado);
    const multiplicadorFinal = multiplicadorBase * multiplicadorDado * modificadorAtaque;
    const danoBase = statsAtacante.forca;
    let danoTotal = (danoBase * multiplicadorFinal);
    const reducaoDeDano = Math.floor(statsDefensor.constituicao / 3);
    danoTotal -= reducaoDeDano;
    
    danoTotal *= modificadorDefesa; // Aplica modificador de defesa do alvo

    const danoFinal = Math.round(danoTotal > 0 ? danoTotal : 1);
    return { dano: danoFinal, resultadoDado: resultadoDado, isCritico: resultadoDado === 6 };
}
// --- FUNÇÕES DE TURNO E JOGO ---
function avancarTurno() {
    if (estado && estado.party) {
        let proximoIndex = (estado.turnoPersonagemAtual + 1) % estado.party.length;
        let voltas = 0; // Previne loop infinito se todos estiverem mortos
        while (estado.party[proximoIndex].pontosDeVida.atual <= 0 && voltas < estado.party.length) {
            proximoIndex = (proximoIndex + 1) % estado.party.length;
            voltas++;
        }
        estado.turnoPersonagemAtual = proximoIndex;
    }
}


function fimDeRodada() {
    if (estado && estado.party) {
        estado.party.forEach(personagem => {
            if (personagem.habilidade.cooldownAtual > 0) personagem.habilidade.cooldownAtual--;
            if(personagem.statusEffects?.buff_constituicao?.duracao > 0) {
                personagem.statusEffects.buff_constituicao.duracao--;
                if(personagem.statusEffects.buff_constituicao.duracao === 0) {
                    personagem.atributos.constituicao -= 5;
                    const statsAtuais = getStatsComEquipamento(personagem);
                    const vidaMaxAntiga = personagem.pontosDeVida.max;
                    personagem.pontosDeVida.max = 100 + (statsAtuais.constituicao * 5) + ((personagem.nivel - 1) * 10);
                    personagem.pontosDeVida.atual = Math.max(1, Math.round(personagem.pontosDeVida.atual * (personagem.pontosDeVida.max / vidaMaxAntiga)));
                }
            }
        });
    }
}

function usarHabilidade(personagemIndex, alvoInimigoId, inimigosAtuais) {
    const personagem = estado.party[personagemIndex];
    const stats = getStatsComEquipamento(personagem);
    const log = [];
    let ataqueInfo = { dano: 0, isCritico: false, resultadoDado: null, alvoIndex: alvoInimigoId, afetados: [] };

    if (personagem.habilidade.cooldownAtual > 0) {
        log.push(`${personagem.nome} tenta usar ${personagem.habilidade.nome}, mas está em tempo de recarga.`);
        return { log, ataqueInfo };
    }

    personagem.habilidade.cooldownAtual = personagem.habilidade.cooldownMax;
    log.push(`${personagem.nome} usa ${personagem.habilidade.nome}!`);

    switch (personagem.habilidade.tipo) {
        case 'DANO':
            const alvo = inimigosAtuais.find(i => i.instanciaId === alvoInimigoId);
            if (alvo) {
                const danoHabilidade = Math.floor(stats.forca * personagem.habilidade.valor);
                ataqueInfo.dano = danoHabilidade;
                ataqueInfo.afetados.push({ id: alvo.instanciaId, dano: danoHabilidade });
                log.push(`O golpe atinge ${alvo.nome}, causando ${danoHabilidade} de dano!`);
            }
            break;

        case 'DANO_AREA': // Habilidade de Elias
            inimigosAtuais.forEach(inimigo => {
                if (inimigo.pontosDeVida.atual > 0) {
                    const danoArea = Math.floor(stats.destreza * personagem.habilidade.valor);
                    ataqueInfo.afetados.push({ id: inimigo.instanciaId, dano: danoArea });
                }
            });
            log.push(`Uma chuva de fogo atinge todos os inimigos!`);
            break;

        case 'CURA_GRUPO': // Habilidade de Ester
            estado.party.forEach(membro => {
                const cura = Math.floor(stats.destreza * personagem.habilidade.valor);
                membro.pontosDeVida.atual = Math.min(membro.pontosDeVida.max, membro.pontosDeVida.atual + cura);
                log.push(`${membro.nome} foi curado em ${cura} pontos de vida!`);
            });
            break;
            
        case 'BUFF_DANO': // Habilidade de Sansão
            personagem.statusEffects = personagem.statusEffects || {};
            personagem.statusEffects.buff_dano = { duracao: 3, valor: personagem.habilidade.valor };
            log.push(`${personagem.nome} entra em fúria! Seu dano aumentará por 3 turnos.`);
            break;

        case 'BUFF_OFENSIVO_GRUPO': // Habilidade de Débora
            log.push(`O canto de Débora inspira coragem no grupo!`);
            estado.party.forEach(membro => {
                membro.statusEffects = membro.statusEffects || {};
                membro.statusEffects.buff_ofensivo = { duracao: 3, valor: personagem.habilidade.valor };
            });
            break;
            
        case 'DEBUFF_DEFESA_GRUPO': // Habilidade de Josué
            log.push(`O som da trombeta abala os inimigos!`);
            inimigosAtuais.forEach(inimigo => {
                inimigo.statusEffects = inimigo.statusEffects || {};
                inimigo.statusEffects.debuff_defesa = { duracao: 3, valor: personagem.habilidade.valor };
            });
            break;
    }

    return { log, ataqueInfo };
}

function distribuirXp(xpGanha) {
    estado.party.forEach(personagem => {
        personagem.xp += xpGanha;
        if (personagem.xp >= personagem.xpParaProximoNivel) {
            personagem.nivel++;
            personagem.xp -= personagem.xpParaProximoNivel;
            personagem.xpParaProximoNivel = Math.floor(personagem.xpParaProximoNivel * 1.5);
            personagem.pontosDeAtributo += 1;
            estado.log.push(`${personagem.nome} subiu para o nível ${personagem.nivel}!`);
        }
    });
}
async function iniciarNovoJogo() {
    score = 0;
    const resInimigos = await pool.query("SELECT * FROM inimigos WHERE tipo != 'Chefe' ORDER BY nivel");
    const resChefes = await pool.query("SELECT * FROM inimigos WHERE tipo = 'Chefe' ORDER BY nivel");
    if (resInimigos.rows.length === 0) throw new Error("Faltam inimigos no banco de dados!");

    const inimigosPorNivel = {};
    resInimigos.rows.forEach(inimigo => {
        if (!inimigosPorNivel[inimigo.nivel]) {
            inimigosPorNivel[inimigo.nivel] = [];
        }
        inimigosPorNivel[inimigo.nivel].push(inimigo);
    });

    let listaDeEncontros = [];

    const farao = resChefes.rows.find(c => c.nome === 'Faraó');
    const nabucodonosor = resChefes.rows.find(c => c.nome === 'Nabucodonosor');
    const oDiabo = resChefes.rows.find(c => c.nome === 'O Diabo');

    for (let i = 1; i <= 30; i++) {
        if (i === 10 && farao) {
            listaDeEncontros.push([farao]);
        } else if (i === 20 && nabucodonosor) {
            listaDeEncontros.push([nabucodonosor]);
        } else if (i === 30 && oDiabo) {
            listaDeEncontros.push([oDiabo]);
        } else {
            if (i >= 21) {
                listaDeEncontros.push(gerarEncontro(inimigosPorNivel, 3, i));
            } else if (i >= 11) {
                listaDeEncontros.push(gerarEncontro(inimigosPorNivel, 2, i));
            } else {
                listaDeEncontros.push(gerarEncontro(inimigosPorNivel, 1, i));
            }
        }
    }

     const heroiPrincipal = {
        nome: "Augusto", classe: "Herói", id: 0, nivel: 1, xp: 0, xpParaProximoNivel: calcularXpNecessario(1), pontosDeAtributo: 0,
        pontosDeVida: { max: 125, atual: 125 }, atributos: { forca: 15, destreza: 12, constituicao: 15 },
        habilidade: { nome: 'Clamor da Fé', tipo: 'DANO', valor: 2.0, cooldownAtual: 0, cooldownMax: COOLDOWN_HABILIDADE_BASE, descricao: 'Causa 200% do dano de Força em um único alvo.' },
        equipamento: { universal: null, classe: null },
        statusEffects: {},
        postura: 'Tatico'
    };
    estado = {
        party: [heroiPrincipal],
        inventario: { pocoes: [], equipamentos: [] },
        turnoPersonagemAtual: 0, nivelAtual: 0,
        status: 'em_andamento', listaDeEncontros
    };

    const primeiroEncontro = estado.listaDeEncontros[0].map((inimigo, index) => ({
        ...inimigo, instanciaId: index,
        pontosDeVida: { ...inimigo.pontos_de_vida, atual: inimigo.pontos_de_vida.max }, statusEffects: {}
    }));

    return {
        party: estado.party,
        inventario: estado.inventario,
        inimigos: primeiroEncontro,
        log: [`${primeiroEncontro.length > 1 ? 'Inimigos selvagens aparecem!' : 'Um inimigo selvagem aparece!'}`],
        nivelAtual: 1, totalNiveis: listaDeEncontros.length, turnoPersonagemAtual: 0
    };
}

function gerarEncontro(inimigosPorNivel, quantidade, nivelMaximo) {
    const encontro = [];
    const niveisDisponiveis = Object.keys(inimigosPorNivel).filter(nivel => parseInt(nivel) <= nivelMaximo);

    if (niveisDisponiveis.length === 0) { 
        const nivelMaisBaixo = Object.keys(inimigosPorNivel).sort((a, b) => a - b)[0];
        if (nivelMaisBaixo) {
            niveisDisponiveis.push(nivelMaisBaixo);
        } else {
            return []; 
        }
    }

    for (let i = 0; i < quantidade; i++) {
        const nivelAleatorio = niveisDisponiveis[Math.floor(Math.random() * niveisDisponiveis.length)];
        const inimigosDoNivel = inimigosPorNivel[nivelAleatorio];
        const inimigoAleatorio = inimigosDoNivel[Math.floor(Math.random() * inimigosDoNivel.length)];
        encontro.push(inimigoAleatorio);
    }
    return encontro;
}
async function prepararProximoNivel() {
    estado.nivelAtual++;
    // CORREÇÃO: Reduz o tempo de recarga de todas as habilidades no início de um novo nível.
    estado.party.forEach(p => {
        if (p.habilidade.cooldownAtual > 0) {
            p.habilidade.cooldownAtual--;
        }
    });

    if (estado.nivelAtual > estado.totalNivels) {
        estado.vitoria = true;
        estado.log.push("Parabéns! Você completou todos os níveis!");
        return estado;
    }

    const inimigosDoNivel = await buscarInimigos(estado.nivelAtual);
    estado.inimigos = inimigosDoNivel.map((inimigo, index) => ({
        ...inimigo,
        pontosDeVida: { ...inimigo.pontos_de_vida },
        instanciaId: Date.now() + index
    }));
    
    estado.log.push(`Nível ${estado.nivelAtual} começou! Inimigos apareceram!`);
    estado.turnoPersonagemAtual = 0;

    if (estado.nivelAtual > 1 && estado.nivelAtual % 2 === 0) {
         estado.recrutamentoPendente = true;
         estado.opcoesRecrutamento = await buscarAliadosAleatorios(3);
    } else {
        estado.recrutamentoPendente = false;
    }
    return { ...estado };
}


async function processarAcaoCombate(acao, inimigosRecebidos, personagemIndex, alvoInimigoId) {
    estado.log = [];

    const personagem = estado.party[personagemIndex];
    // CORREÇÃO: Usar a lista de inimigos recebida para encontrar o alvo
    const alvoInimigo = inimigosRecebidos.find(i => i.instanciaId === alvoInimigoId);
    let ataqueInfo = null;

    if (!alvoInimigo && acao === 'atacar') {
        throw new Error("Alvo inválido selecionado para o ataque.");
    }

    // Criamos uma cópia da lista de inimigos para poder modificá-la durante este turno
    let inimigosNesteTurno = JSON.parse(JSON.stringify(inimigosRecebidos));

    if (acao === 'atacar') {
        const statsAtacante = getStatsComEquipamento(personagem);
        const resultadoDado = rolarDado();
        const multiplicador = getMultiplicadorDoDado(resultadoDado);
        const danoBase = statsAtacante.forca;
        const danoFinal = Math.floor(danoBase * multiplicador);

        // CORREÇÃO: Encontrar e aplicar o dano na cópia da lista de inimigos, não na do servidor.
        const indexInimigo = inimigosNesteTurno.findIndex(i => i.instanciaId === alvoInimigo.instanciaId);
        if (indexInimigo !== -1) {
            inimigosNesteTurno[indexInimigo].pontosDeVida.atual = Math.max(0, inimigosNesteTurno[indexInimigo].pontosDeVida.atual - danoFinal);
        }

        const isCritico = resultadoDado === 6;
        estado.log.push(`${personagem.nome} ataca ${alvoInimigo.nome}, causando ${danoFinal} de dano! (Dado: ${resultadoDado})`);
        if (isCritico) {
            estado.log.push("Acerto Crítico!");
        }

        ataqueInfo = {
            dano: danoFinal,
            resultadoDado: resultadoDado,
            isCritico: isCritico,
            alvoIndex: alvoInimigo.instanciaId
        };
    } else if (acao === 'habilidade') {
        const resultadoHabilidade = usarHabilidade(personagemIndex, alvoInimigo ? alvoInimigo.instanciaId : null, inimigosNesteTurno);
        ataqueInfo = resultadoHabilidade.ataqueInfo;
        estado.log.push(...resultadoHabilidade.log);

        if (ataqueInfo && ataqueInfo.afetados && ataqueInfo.afetados.length > 0) {
            ataqueInfo.afetados.forEach(alvoAfetado => {
                const indexInimigo = inimigosNesteTurno.findIndex(i => i.instanciaId === alvoAfetado.id);
                if (indexInimigo !== -1) {
                    inimigosNesteTurno[indexInimigo].pontosDeVida.atual = Math.max(0, inimigosNesteTurno[indexInimigo].pontosDeVida.atual - alvoAfetado.dano);
                }
            });
        }
    }

    if (personagemIndex === estado.party.length - 1) {
        fimDeRodada();
        estado.log.push("Fim da rodada! Habilidades recarregando...");
    }

    const inimigosVivosAntes = inimigosRecebidos.filter(i => i.pontosDeVida.atual > 0);
    const inimigosDerrotados = inimigosNesteTurno.filter(i => i.pontosDeVida.atual <= 0 && inimigosVivosAntes.some(iva => iva.instanciaId === i.instanciaId && iva.pontosDeVida.atual > 0));
    
    if (inimigosDerrotados.length > 0) {
        inimigosDerrotados.forEach(inimigo => {
            score += inimigo.pontosDeVida.max;
            estado.log.push(`+${inimigo.pontosDeVida.max} pontos por derrotar ${inimigo.nome}!`);
        });
    }

    estado.inimigos = inimigosNesteTurno.filter(i => i.pontosDeVida.atual > 0);

    if (inimigosNesteTurno.every(i => i.pontosDeVida.atual <= 0)) {
        const vitoriaEstado = await processarVitoria(estado.party, inimigosRecebidos, estado.log);
        vitoriaEstado.ataqueInfo = ataqueInfo; // Mantém a informação do ataque para a animação
        vitoriaEstado.ataquesInimigosInfo = []; // Garante que não haverá contra-ataque
        vitoriaEstado.score = score;
        return vitoriaEstado;
    }

    const ataquesInimigosInfo = [];
    for (const inimigo of estado.inimigos) {
        const statsInimigo = getStatsComEquipamento(inimigo);
        const resultadoDado = rolarDado();
        const multiplicador = getMultiplicadorDoDado(resultadoDado);
        const danoBase = statsInimigo.forca;
        const danoFinal = Math.floor(danoBase * multiplicador);

        const alvosVivos = estado.party.filter(p => p.pontosDeVida.atual > 0);
        if (alvosVivos.length === 0) break;

        const alvoHeroi = alvosVivos[Math.floor(Math.random() * alvosVivos.length)];
        const alvoHeroiIndex = estado.party.findIndex(p => p.nome === alvoHeroi.nome);

        estado.party[alvoHeroiIndex].pontosDeVida.atual = Math.max(0, estado.party[alvoHeroiIndex].pontosDeVida.atual - danoFinal);
        
        estado.log.push(`${inimigo.nome} contra-ataca ${alvoHeroi.nome}, causando ${danoFinal} de dano. (Dado: ${resultadoDado})`);

        ataquesInimigosInfo.push({
            atacanteInstanciaId: inimigo.instanciaId,
            dano: danoFinal,
            resultadoDado: resultadoDado,
            isCritico: resultadoDado === 6,
            alvoIndex: alvoHeroiIndex
        });

        if (estado.party[alvoHeroiIndex].pontosDeVida.atual <= 0) {
            estado.log.push(`${alvoHeroi.nome} foi derrotado!`);
        }
    }

    if (estado.party.every(p => p.pontosDeVida.atual <= 0)) {
        estado.log.push("Seu grupo foi derrotado. Fim de jogo.");
        estado.derrota = true;
        estado.score = score;
        return estado;
    }
    
    estado.turnoPersonagemAtual = (estado.turnoPersonagemAtual + 1) % estado.party.length;
    while (estado.party[estado.turnoPersonagemAtual].pontosDeVida.atual <= 0) {
        estado.turnoPersonagemAtual = (estado.turnoPersonagemAtual + 1) % estado.party.length;
    }

    estado.ataqueInfo = ataqueInfo;
    estado.ataquesInimigosInfo = ataquesInimigosInfo;
    estado.score = score;
    return estado;
}

async function turnoDosInimigos(inimigos, party, log) {
    fimDeRodada(); 
    const ataquesInimigosInfo = [];
    const inimigosVivos = inimigos.filter(i => i.pontosDeVida.atual > 0);

    for (const inimigo of inimigosVivos) {
        if (inimigo.statusEffects && inimigo.statusEffects.sangramento && inimigo.statusEffects.sangramento.duracao > 0) {
            const danoDoT = inimigo.statusEffects.sangramento.danoPorRodada;
            inimigo.pontosDeVida.atual = Math.max(0, inimigo.pontosDeVida.atual - danoDoT);
            log.push(`${inimigo.nome} sofre ${danoDoT} de dano de sangramento!`);
            inimigo.statusEffects.sangramento.duracao--;
            if (inimigo.pontosDeVida.atual <= 0) {
                log.push(`${inimigo.nome} sucumbiu ao sangramento!`);
                continue; 
            }
        }

        const alvosVivos = party.filter(personagem => personagem.pontosDeVida.atual > 0);
        if (alvosVivos.length === 0) return { derrota: true, ataquesInimigosInfo: [] };

        let alvo = party[inimigo.ultimoAtacanteIndex];
        if (!alvo || alvo.pontosDeVida.atual <= 0) {
            alvo = alvosVivos[Math.floor(Math.random() * alvosVivos.length)];
        }

        const alvoIndex = party.indexOf(alvo);
        const ataqueInfo = calcularDano(inimigo, alvo);
        ataquesInimigosInfo.push({ ...ataqueInfo, alvoIndex, atacanteInstanciaId: inimigo.instanciaId });

        log.push(`${inimigo.nome} ataca ${alvo.nome}... (Dado: ${ataqueInfo.resultadoDado})`);
        if (ataqueInfo.isCritico) log.push("ATAQUE CRÍTICO!");
        alvo.pontosDeVida.atual -= ataqueInfo.dano;
        log.push(`Causou ${ataqueInfo.dano} de dano!`);

        if (alvo.pontosDeVida.atual <= 0) {
            alvo.pontosDeVida.atual = 0;
            log.push(`☠️ ${alvo.nome} foi derrotado!`);
        }
    }
    
    // MODIFICAÇÃO AQUI: Verifica se todos os inimigos morreram após o turno deles
    const inimigosAindaVivos = inimigos.filter(i => i.pontosDeVida.atual > 0);
    if(inimigosAindaVivos.length === 0) {
        // Dispara a vitória aqui se todos os inimigos morreram no turno deles
        const estadoVitoria = await processarVitoria(party, inimigos, log);
        return { ...estadoVitoria, ataquesInimigosInfo };
    }

    const grupoDerrotado = party.every(personagem => personagem.pontosDeVida.atual <= 0);
    if (grupoDerrotado) {
        log.push('Seu grupo foi derrotado! Fim de jogo.');
        estado = {};
        return { derrota: true, ataquesInimigosInfo };
    }

    let proximoJogador = party[estado.turnoPersonagemAtual];
    if (proximoJogador.pontosDeVida.atual <= 0) {
        avancarTurno();
        proximoJogador = party[estado.turnoPersonagemAtual];
    }
    log.push(`É o turno de ${proximoJogador.nome}.`);

    return { derrota: false, ataquesInimigosInfo };
}

async function processarVitoria(party, inimigosDerrotados, log) {
    log.push(`Inimigos derrotados!`);

    let xpTotalInimigos = 0;
    let lootObtido = [];

    for (const inimigo of inimigosDerrotados) {
        xpTotalInimigos += inimigo.xp_concedida;
        const isChefe = inimigo.tipo === 'Chefe';

        if (isChefe) {
            // Drop 1 (100% chance)
            let itemDropado;
            if (Math.random() < 0.5) {
               const bossItensMap = {
                    'Faraó': 'Cetro do Faraó',
                    'Nabucodonosor': 'Coroa de Nabucodonosor',
                    'O Diabo': 'Fragmento de Sombra'
                };
                const itemNome = bossItensMap[inimigo.nome];

                if(itemNome) {
                    const itemRes = await pool.query('SELECT * FROM items WHERE nome = $1', [itemNome]);
                    if (itemRes.rows.length > 0) itemDropado = itemRes.rows[0];
                }

            }
            if(!itemDropado) {
                 itemDropado = await sortearItemAleatorio(true);
            }
            if (itemDropado) lootObtido.push(itemDropado);


            // Drop 2 (50% chance)
            if (Math.random() < 0.5) {
                const itemExtra = await sortearItemAleatorio(true);
                if (itemExtra) lootObtido.push(itemExtra);
            }

        } else { // Inimigo Comum
            // Drop 1 (50% chance)
            if (Math.random() < 0.5) {
                const itemDropado = await sortearItemAleatorio(false);
                if (itemDropado) {
                    lootObtido.push(itemDropado);
                    // Drop 2 (25% chance se o primeiro dropou)
                    if (Math.random() < 0.25) {
                        const itemExtra = await sortearItemAleatorio(false);
                        if (itemExtra) lootObtido.push(itemExtra);
                    }
                }
            }
        }
    }

    // Adicionar itens ao inventário e log
    if (lootObtido.length > 0) {
        let nomesLoot = [];
        lootObtido.forEach(item => {
            if (item.tipo === 'Consumivel') {
                const pocoesExistentes = estado.inventario.pocoes.find(p => p.id === item.id);
                if (pocoesExistentes) pocoesExistentes.quantidade++;
                else estado.inventario.pocoes.push({ ...item, quantidade: 1 });
            } else {
                estado.inventario.equipamentos.push(item);
            }
            nomesLoot.push(item.nome);
        });
        log.push(`Loot obtido: ${nomesLoot.join(', ')}!`);
    }

    // (O restante da função continua igual: distribuição de XP, level up, etc...)
    party.forEach(personagem => {
        if (personagem.pontosDeVida.atual > 0) {
            const modificadorXp = 0.75 + (Math.random() * 0.5);
            const xpGanha = Math.round(xpTotalInimigos * modificadorXp / party.filter(p => p.pontosDeVida.atual > 0).length);
            personagem.xp += xpGanha;
            log.push(`${personagem.nome} ganhou ${xpGanha} de XP!`);
        }
        personagem.pontosDeVida.atual = Math.min(personagem.pontosDeVida.max, personagem.pontosDeVida.atual + CURA_POS_COMBATE);
        while (personagem.xp >= personagem.xpParaProximoNivel) {
            personagem.nivel++;
            personagem.xp -= personagem.xpParaProximoNivel;
            personagem.xpParaProximoNivel = calcularXpNecessario(personagem.nivel);
            personagem.pontosDeAtributo++;
            personagem.atributos.constituicao++;
            personagem.pontosDeVida.max += 10;
            personagem.pontosDeVida.atual = personagem.pontosDeVida.max;
            log.push(`✨ ${personagem.nome} subiu para o nível ${personagem.nivel}!`);
        }
    });

    estado.nivelAtual++;

    if (estado.nivelAtual >= estado.listaDeEncontros.length) {
        estado.status = 'VITORIA';
        log.push("🎉 PARABÉNS! Você venceu o jogo!");
        return { party, inventario: estado.inventario, inimigos: [], log, vitoria: true, turnoPersonagemAtual: 0 };
    }

    const eChefe = inimigosDerrotados.some(i => i.tipo === 'Chefe');
    if ((eChefe || Math.random() < CHANCE_RECRUTAMENTO) && party.length < 4) {
        estado.status = 'recrutamento';
        const resAliados = await pool.query("SELECT id, nome, classe, habilidade_nome, habilidade_descricao, atributos FROM aliados ORDER BY RANDOM() LIMIT 2");
        log.push("Uma oportunidade de recrutamento surgiu!");
        return { party, inventario: estado.inventario, inimigos: [], log, recrutamentoPendente: true, opcoesRecrutamento: resAliados.rows };
    }

    const proxEncontroInfo = estado.listaDeEncontros[estado.nivelAtual];
    const proxInimigos = proxEncontroInfo.map((inimigo, index) => ({
        ...inimigo, instanciaId: index,
        pontosDeVida: { ...inimigo.pontos_de_vida, atual: inimigo.pontos_de_vida.max }, statusEffects: {}
    }));
    log.push(`Prepare-se! ${proxInimigos.length > 1 ? 'Novos inimigos se aproximam!' : `Um ${proxInimigos[0].nome} se aproxima!`}`);
    estado.turnoPersonagemAtual = 0;
    return {
        party, inventario: estado.inventario, inimigos: proxInimigos, log,
        nivelAtual: estado.nivelAtual + 1, totalNiveis: estado.listaDeEncontros.length,
        turnoPersonagemAtual: 0
    };
}

function desistirDoJogo() {
    estado.log = ["Você desistiu da batalha."];
    estado.derrota = true;
    estado.score = score; // Garante que a pontuação seja registrada
    return estado;
}

async function sortearItemAleatorio(isBossDrop) {
    // Busca itens no DB. Se não for drop de chefe, exclui itens de chefe.
    const query = isBossDrop 
        ? 'SELECT * FROM items' 
        : 'SELECT * FROM items WHERE is_boss_item = FALSE';
    const res = await pool.query(query);
    const itensDisponiveis = res.rows;

    if (itensDisponiveis.length === 0) return null;

    // Cria uma "piscina" de loot com pesos
    const piscinaDeLoot = [];
    itensDisponiveis.forEach(item => {
        const peso = (item.tipo === 'Consumivel') ? pesoPocao : (pesosRaridade[item.raridade] || 1);
        for (let i = 0; i < peso; i++) {
            piscinaDeLoot.push(item);
        }
    });

    // Sorteia um item da piscina
    const indexSorteado = Math.floor(Math.random() * piscinaDeLoot.length);
    return piscinaDeLoot[indexSorteado];
}

function recalcularPontosDeVida(personagem) {
    const statsComEquipamento = getStatsComEquipamento(personagem);
    const vidaMaxAntiga = personagem.pontosDeVida.max;
    // A fórmula base para a vida máxima. Ajuste se necessário.
    personagem.pontosDeVida.max = 100 + (statsComEquipamento.constituicao * 5) + ((personagem.nivel - 1) * 10);
    // Ajusta a vida atual proporcionalmente à nova vida máxima.
    personagem.pontosDeVida.atual = Math.max(1, Math.round(personagem.pontosDeVida.atual * (personagem.pontosDeVida.max / vidaMaxAntiga)));
}

async function recrutarAliado(idAliado) {
    if (estado.status !== 'recrutamento') throw new Error("Não é o momento de recrutar.");
    const res = await pool.query("SELECT * FROM aliados WHERE id = $1", [idAliado]);
    if (res.rows.length === 0) throw new Error("Aliado não encontrado.");

    const aliadoInfo = res.rows[0];
    const novoAliado = {
        ...aliadoInfo, nivel: 1, xp: 0, xpParaProximoNivel: calcularXpNecessario(1), pontosDeAtributo: 0,
        pontosDeVida: { max: 100 + (aliadoInfo.atributos.constituicao * 2), atual: 100 + (aliadoInfo.atributos.constituicao * 2) },
        habilidade: { nome: aliadoInfo.habilidade_nome, tipo: aliadoInfo.habilidade_tipo, valor: aliadoInfo.habilidade_valor, descricao: aliadoInfo.habilidade_descricao, cooldownAtual: 0, cooldownMax: COOLDOWN_HABILIDADE_BASE },
        equipamento: { universal: null, classe: null },
        statusEffects: {}
    };
    estado.party.push(novoAliado);

    estado.status = 'em_andamento';
    estado.turnoPersonagemAtual = 0;

    const proxEncontroInfo = estado.listaDeEncontros[estado.nivelAtual];
    const proxInimigos = proxEncontroInfo.map((inimigo, index) => ({
        ...inimigo, instanciaId: index,
        pontosDeVida: { ...inimigo.pontos_de_vida, atual: inimigo.pontos_de_vida.max }, statusEffects: {}
    }));
    const log = [`${novoAliado.nome} juntou-se ao seu grupo!`, `Prepare-se! ${proxInimigos.length > 1 ? 'Novos inimigos se aproximam!' : `Um ${proxInimigos[0].nome} se aproxima!`}`];
    return {
        party: estado.party, inventario: estado.inventario, inimigos: proxInimigos, log,
        nivelAtual: estado.nivelAtual + 1, totalNiveis: estado.listaDeEncontros.length,
        turnoPersonagemAtual: 0
    };
}

function distribuirAtributo(atributo, personagemIndex) {
    const personagem = estado.party[personagemIndex];
    if (!personagem || personagem.pontosDeAtributo <= 0) throw new Error("Pontos insuficientes.");

    personagem.atributos[atributo]++;
    personagem.pontosDeAtributo--;

    if (atributo === 'constituicao') {
        personagem.pontosDeVida.max += 5;
        personagem.pontosDeVida.atual += 5;
    }
    return { party: estado.party };
}

function usarItem(personagemIndex, itemId) {
    const personagem = estado.party[personagemIndex];
    if (!personagem) throw new Error("Personagem não encontrado.");
    const itemIndex = estado.inventario.pocoes.findIndex(p => p.id === itemId);
    if (itemIndex === -1) throw new Error("Item não encontrado no inventário.");
    
    const item = estado.inventario.pocoes[itemIndex];
    
    if (item.efeito_tipo === 'CURA_PERCENTUAL') {
        const cura = Math.round(personagem.pontosDeVida.max * item.efeito_valor);
        personagem.pontosDeVida.atual = Math.min(personagem.pontosDeVida.max, personagem.pontosDeVida.atual + cura);
    } else if (item.efeito_tipo === 'LEVEL_UP') {
        personagem.xp += personagem.xpParaProximoNivel + 1;
    }

    item.quantidade--;
    if (item.quantidade <= 0) {
        estado.inventario.pocoes.splice(itemIndex, 1);
    }
    return { party: estado.party, inventario: estado.inventario };
}

function equiparItem(personagemIndex, itemId) {
    const personagem = estado.party[personagemIndex];
    if (!personagem) throw new Error("Personagem não encontrado.");
    const itemIndex = estado.inventario.equipamentos.findIndex(e => e.id === itemId);
    if (itemIndex === -1) throw new Error("Equipamento não encontrado.");

    const item = estado.inventario.equipamentos[itemIndex];
    if (item.classe_restrita && item.classe_restrita !== personagem.classe) throw new Error("Este personagem não pode usar este item.");

    const slot = item.slot;
    // Devolve o item antigo para o inventário, se houver.
    if (personagem.equipamento[slot]) {
        estado.inventario.equipamentos.push(personagem.equipamento[slot]);
    }

    personagem.equipamento[slot] = item;
    estado.inventario.equipamentos.splice(itemIndex, 1);
    
    // Recalcula os pontos de vida após equipar o novo item.
    recalcularPontosDeVida(personagem);
    
    return { party: estado.party, inventario: estado.inventario };
}

function desequiparItem(personagemIndex, slot) {
    const personagem = estado.party[personagemIndex];
    if (!personagem) throw new Error("Personagem não encontrado.");
    if (!slot || !personagem.equipamento[slot]) throw new Error("Nenhum item para desequipar neste slot.");

    const item = personagem.equipamento[slot];
    estado.inventario.equipamentos.push(item);
    personagem.equipamento[slot] = null;

    recalcularPontosDeVida(personagem);

    return { party: estado.party, inventario: estado.inventario };
}

function mudarPostura(personagemIndex, novaPostura) {
    const personagem = estado.party[personagemIndex];
    if (!personagem) throw new Error("Personagem não encontrado.");

    const posturasValidas = ['Agressivo', 'Tatico', 'Defensivo'];
    if (!posturasValidas.includes(novaPostura)) throw new Error("Postura inválida.");

    personagem.postura = novaPostura;
    return { party: estado.party };
}

function getScore() {
    return score;
}

module.exports = {
    iniciarNovoJogo,
    processarAcaoCombate,
    distribuirAtributo,
    recrutarAliado,
    usarItem,
    equiparItem,
    desequiparItem,
    mudarPostura,
    getScore,
    desistirDoJogo
};