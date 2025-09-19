// PasssoBemSolto/server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth'); // Importa as rotas de autenticação

const app = express();
const PORT = 3000;

// --- Middlewares ---
app.use(express.json()); // Para entender JSON no corpo das requisições

app.use(session({
    secret: process.env.SESSION_SECRET || 'um-segredo-muito-secreto', // Crie uma variável de ambiente para isso
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' } // Use 'true' em produção com HTTPS
}));

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
    // Exclui arquivos estáticos da verificação de login
    if (req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.startsWith('/auth')) {
        return next();
    }
    requireLogin(req, res, next);
});


app.use(express.static('public')); // Para servir os ficheiros do front-end

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