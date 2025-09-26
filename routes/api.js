// PasssoBemSolto/routes/api.js
const express = require('express');
const pool = require('../config/database');
const router = express.Router();
const gameManager = require('../game/gameManager');

router.get('/jogo/iniciar', async (req, res) => {
    try {
        const estadoInicial = await gameManager.iniciarNovoJogo();
        res.json(estadoInicial);
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensagem: err.message });
    }
});

// Rota única para todas as ações de combate
router.post('/combate/acao', async (req, res) => {
    try {
        const { acao, inimigos, personagemIndex, alvoInimigoIndex } = req.body;
        const novoEstado = await gameManager.processarAcaoCombate(acao, inimigos, personagemIndex, alvoInimigoIndex);
        res.json(novoEstado);
    } catch (err) {
        console.error(err);
        res.status(400).json({ mensagem: err.message });
    }
});

// ... (rotas de inventário)

// --- NOVA ROTA DE DESEQUIPAR ---
router.post('/inventario/desequipar', (req, res) => {
    try {
        const { personagemIndex, slot } = req.body;
        const resultado = gameManager.desequiparItem(personagemIndex, slot);
        res.json(resultado);
    } catch (err) {
        res.status(400).json({ mensagem: err.message });
    }
});


// Rota para recrutar um novo aliado
router.post('/jogo/recrutar', async (req, res) => {
    try {
        const { idAliado } = req.body;
        const novoEstado = await gameManager.recrutarAliado(idAliado);
        res.json(novoEstado);
    } catch (err) {
        console.error(err);
        res.status(400).json({ mensagem: err.message });
    }
});

// Rota para distribuir pontos de atributo
router.post('/heroi/distribuir-atributo', (req, res) => {
    try {
        const { atributo, personagemIndex } = req.body;
        const resultado = gameManager.distribuirAtributo(atributo, personagemIndex);
        res.json(resultado);
    } catch (err) {
        console.error(err);
        res.status(400).json({ mensagem: err.message });
    }
});

router.post('/inventario/usar', (req, res) => {
    try {
        const { personagemIndex, itemId } = req.body;
        const resultado = gameManager.usarItem(personagemIndex, itemId);
        res.json(resultado);
    } catch (err) {
        res.status(400).json({ mensagem: err.message });
    }
});

router.post('/inventario/equipar', (req, res) => {
    try {
        const { personagemIndex, itemId } = req.body;
        const resultado = gameManager.equiparItem(personagemIndex, itemId);
        res.json(resultado);
    } catch (err) {
        res.status(400).json({ mensagem: err.message });
    }
});

router.post('/heroi/mudar-postura', (req, res) => {
    try {
        const { personagemIndex, novaPostura } = req.body;
        const resultado = gameManager.mudarPostura(personagemIndex, novaPostura);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ mensagem: error.message });
    }
});

router.post('/jogo/finalizar', async (req, res) => {
    try {
        const { score } = req.body;
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({ mensagem: "Usuário não autenticado." });
        }

        await pool.query('INSERT INTO scores (user_id, score) VALUES ($1, $2)', [userId, score]);
        res.status(200).json({ redirectTo: '/dashboard.html' });

    } catch (err) {
        console.error("Erro ao salvar pontuação:", err);
        res.status(500).json({ mensagem: "Erro interno ao salvar a pontuação." });
    }
});


// Rota para buscar o placar

router.post('/jogo/desistir', (req, res) => {
    try {
        const resultado = gameManager.desistirDoJogo();
        res.json(resultado);
    } catch (err) {
        res.status(400).json({ mensagem: err.message });
    }
});


module.exports = router;