// PasssoBemSolto/server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth'); // Importa as rotas de autenticação
const pool = require('./config/database'); // Importe o pool de conexão do seu DB
const pgSession = require('connect-pg-simple')(session); // Importe e configure o connect-pg-simple

const app = express();
const PORT = process.env.PORT || 3000; // Use a porta do ambiente ou 3000

// --- Middlewares ---
app.use(express.json()); // Para entender JSON no corpo das requisições

app.set('trust proxy', 1);
// MODIFICAÇÃO: Configure a sessão para usar o PostgreSQL
app.use(session({
    store: new pgSession({
        pool: pool,                // Connection pool
        tableName: 'user_sessions' // Nome da tabela para as sessões
    }),
    secret: process.env.SESSION_SECRET || 'um-segredo-muito-secreto',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use 'true' em produção com HTTPS
        httpOnly: true, // Ajuda a prevenir ataques XSS
        sameSite: 'lax', // Proteção contra CSRF
        maxAge: 30 * 24 * 60 * 60 * 1000 // Opcional: define a duração do cookie (ex: 30 dias)
    }
}));

app.use(express.static('public'));

// O restante do seu arquivo server.js continua igual...

// Middleware para proteger o acesso ao jogo
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        // Redireciona para o login se não estiver na página de login/registro
        if (req.path !== '/login.html' && req.path !== '/register.html' && !req.path.startsWith('/auth')) {
            return res.redirect('/login.html');
        }
    }
    next();
};

// Aplica o middleware de login a todas as rotas, exceto as de assets estáticos
app.use((req, res, next) => {
    // Lista de caminhos que não exigem login
    const publicPaths = ['/dashboard.html', '/login.html', '/register.html'];
    
    // Verifica se o caminho atual é público ou é um asset estático
    if (req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.startsWith('/auth') || req.path.startsWith('/images') || publicPaths.includes(req.path)) {
        return next();
    }
    
    // Se não for público, exige login
    requireLogin(req, res, next);
});

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

 // Para servir os ficheiros do front-end

// --- Rotas ---
app.use('/auth', authRoutes); // Usa o router de autenticação
app.use('/api', requireLogin, apiRoutes); // Protege as rotas da API

// Rota principal serve o jogo ou redireciona para o login
app.get('/', requireLogin, (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// --- Inicia o Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);

});
