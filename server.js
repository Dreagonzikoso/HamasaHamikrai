// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const pool = require('./config/database');
const pgSession = require('connect-pg-simple')(session);

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares Essenciais ---
app.use(express.json());
app.set('trust proxy', 1);

app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'user_sessions'
    }),
    secret: process.env.SESSION_SECRET || 'um-segredo-muito-secreto',
    resave: false,
    saveUninitialized: false, // Alterado para false para melhor prática
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

// --- Servir Ficheiros Públicos ---
// Todos os ficheiros na pasta 'public' (CSS, imagens, login.html, etc.) são servidos primeiro.
app.use(express.static(path.join(__dirname, 'public')));

// --- Middleware de Autenticação ---
// Esta função irá proteger as rotas que a utilizarem.
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        // Se o utilizador não estiver logado, redireciona para a página de login.
        return res.redirect('/login.html');
    }
    // Se estiver logado, permite que o pedido continue.
    next();
};

// --- Rotas da API (Públicas) ---
// Estas rotas podem ser acedidas sem login.
app.get('/api/scores', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.username, s.score, s.created_at 
            FROM scores s
            JOIN users u ON s.user_id = u.id
            ORDER BY s.score DESC
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao buscar o placar.' });
    }
});

app.get('/api/auth/status', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true });
    } else {
        res.json({ loggedIn: false });
    }
});

// --- Rotas da Aplicação ---
app.use('/auth', authRoutes); // Rotas de login/registo.
app.use('/api', requireLogin, apiRoutes); // Restantes rotas da API que precisam de login.

// --- Rota Principal (Protegida) ---
// Quando alguém acede a "/", o `requireLogin` é executado primeiro.
app.get('/', requireLogin, (req, res) => {
    // Se o `requireLogin` permitir passar, o utilizador está logado e recebe a página do jogo.
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Iniciar o Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor a rodar em http://localhost:${PORT}`);
});
