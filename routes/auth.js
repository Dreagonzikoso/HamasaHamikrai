const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
        res.status(201).send('Usuário registrado com sucesso');
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao registrar usuário. O nome de usuário pode já estar em uso.' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (await bcrypt.compare(password, user.password)) {
                req.session.userId = user.id;
                req.session.username = user.username;
                res.status(200).send('Login bem-sucedido');
            } else {
                res.status(401).send('Senha incorreta');
            }
        } else {
            res.status(404).send('Usuário não encontrado');
        }
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro no servidor durante o login' });
    }
});

module.exports = router;