// PasssoBemSolto/config/database.js
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
    err ? console.error('Erro ao conectar ao PostgreSQL:', err) : console.log('Conectado ao PostgreSQL com sucesso!');
});

module.exports = pool;