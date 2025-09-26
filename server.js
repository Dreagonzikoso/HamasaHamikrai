// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path'); // Adicione o 'path' do Node
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
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

// --- Servir Ficheiros Estáticos ---
// Esta é a forma correta de servir todos os ficheiros da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// --- Middleware de Autenticação ---
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        // Se o utilizador não estiver logado, redireciona para o login
        return res.redirect('/login.html');
    }
    // Se estiver logado, continua para a próxima rota
    next();
};

// --- Rotas Públicas da API (não precisam de login) ---
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
app.use('/auth', authRoutes); // Rotas de login/registo são públicas
app.use('/api', requireLogin, apiRoutes); // TODAS as outras rotas /api são protegidas

// Rota principal (página do jogo) - Protegida pelo middleware requireLogin
app.get('/', requireLogin, (req, res) => {
    // Agora que os ficheiros estáticos estão a ser servidos corretamente,
    // podemos enviar o ficheiro do jogo para os utilizadores logados.
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Iniciar o Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor a rodar em http://localhost:${PORT}`);
});
