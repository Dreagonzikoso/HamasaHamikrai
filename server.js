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
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

// --- Middleware de Autenticação ---
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login.html');
    }
    next();
};

// --- Rota Raiz Protegida ---
// Protege o acesso à página principal do jogo (index.html).
// Deve vir ANTES de app.use(express.static(...)) para ser executada primeiro.
app.get('/', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Servir Arquivos Públicos ---
// Serve os arquivos estáticos como CSS, JS, imagens, e as páginas de login/registro.
app.use(express.static(path.join(__dirname, 'public')));

// --- Rotas Públicas da API (Não precisam de Login) ---
app.use('/auth', authRoutes); // Rotas de login/registro

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

// --- Rotas Protegidas da API (Precisam de Login) ---
// O middleware requireLogin é aplicado a todas as rotas em '/api'.
app.use('/api', requireLogin, apiRoutes);

// --- Iniciar o Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor a rodar em http://localhost:${PORT}`);
});
