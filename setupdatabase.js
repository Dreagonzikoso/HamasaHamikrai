// PasssoBemSolto/setupdatabase.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- LISTA DE INIMIGOS ---
// Substitua a constante 'inimigos' existente por esta:
const inimigos = [
    // Inimigos Comuns
    { nome: "Soldado Egípcio", tipo: "Humanoide", nivel: 1, pontos_de_vida: '{"max": 45, "atual": 45}', atributos: '{"forca": 10, "destreza": 10, "constituicao": 12}', xp_concedida: 35 },
    { nome: "Amalequita Saqueador", tipo: "Humanoide", nivel: 2, pontos_de_vida: '{"max": 55, "atual": 55}', atributos: '{"forca": 12, "destreza": 12, "constituicao": 11}', xp_concedida: 45 },
    { nome: "Soldado Filisteu", tipo: "Humanoide", nivel: 3, pontos_de_vida: '{"max": 70, "atual": 70}', atributos: '{"forca": 14, "destreza": 11, "constituicao": 13}', xp_concedida: 65 },
    { nome: "Falso Profeta", tipo: "Espiritual", nivel: 5, pontos_de_vida: '{"max": 60, "atual": 60}', atributos: '{"forca": 8, "destreza": 15, "constituicao": 10}', xp_concedida: 70 },
    { nome: "Gigante Filisteu", tipo: "Humanoide", nivel: 8, pontos_de_vida: '{"max": 150, "atual": 150}', atributos: '{"forca": 18, "destreza": 8, "constituicao": 18}', xp_concedida: 100 },
    { nome: "Guarda Babilônico", tipo: "Humanoide", nivel: 12, pontos_de_vida: '{"max": 90, "atual": 90}', atributos: '{"forca": 16, "destreza": 12, "constituicao": 15}', xp_concedida: 110 },
    { nome: "Espírito Impuro", tipo: "Espiritual", nivel: 15, pontos_de_vida: '{"max": 100, "atual": 100}', atributos: '{"forca": 15, "destreza": 18, "constituicao": 12}', xp_concedida: 150 },
    { nome: "Behemoth", tipo: "Besta", nivel: 18, pontos_de_vida: '{"max": 250, "atual": 250}', atributos: '{"forca": 22, "destreza": 8, "constituicao": 25}', xp_concedida: 200 },
    { nome: "Demônio da Legião", tipo: "Espiritual", nivel: 22, pontos_de_vida: '{"max": 180, "atual": 180}', atributos: '{"forca": 20, "destreza": 22, "constituicao": 16}', xp_concedida: 250 },
    { nome: "Leviatã", tipo: "Besta", nivel: 25, pontos_de_vida: '{"max": 300, "atual": 300}', atributos: '{"forca": 25, "destreza": 15, "constituicao": 20}', xp_concedida: 350 },

    // Chefes
    { nome: "Faraó", tipo: "Chefe", nivel: 10, pontos_de_vida: '{"max": 200, "atual": 400}', atributos: '{"forca": 40, "destreza": 15, "constituicao": 25}', xp_concedida: 400 },
    { nome: "Nabucodonosor", tipo: "Chefe", nivel: 20, pontos_de_vida: '{"max": 400, "atual": 700}', atributos: '{"forca": 50, "destreza": 20, "constituicao": 30}', xp_concedida: 800 },
    { nome: "O Diabo", tipo: "Chefe", nivel: 30, pontos_de_vida: '{"max": 600, "atual": 1000}', atributos: '{"forca": 65, "destreza": 30, "constituicao": 35}', xp_concedida: 1500 }
];
// --- LISTA DE ALIADOS ---

const aliados = [
    { nome: 'Davi', classe: 'Pastor', habilidade_nome: 'Golpe Preciso', habilidade_tipo: 'DANO', habilidade_valor: 2.5, habilidade_descricao: 'Causa 250% do dano de Destreza em um único alvo.', atributos: '{"forca": 12, "destreza": 18, "constituicao": 13}' },
    { nome: 'Sansão', classe: 'Juiz', habilidade_nome: 'Fúria Divina', habilidade_tipo: 'BUFF_DANO', habilidade_valor: 1.5, habilidade_descricao: 'Aumenta o próprio dano em 50% por 3 turnos.', atributos: '{"forca": 20, "destreza": 10, "constituicao": 16}' },
    { nome: 'Ester', classe: 'Rainha', habilidade_nome: 'Oração Intercessora', habilidade_tipo: 'CURA_GRUPO', habilidade_valor: 1.8, habilidade_descricao: 'Cura todos os aliados com base em 180% da sua Destreza.', atributos: '{"forca": 10, "destreza": 15, "constituicao": 14}' },
    { nome: 'Josué', classe: 'Guerreiro', habilidade_nome: 'Toque da Trombeta', habilidade_tipo: 'DEBUFF_DEFESA_GRUPO', habilidade_valor: 0.75, habilidade_descricao: 'Reduz a defesa de todos os inimigos em 25% por 3 turnos.', atributos: '{"forca": 16, "destreza": 14, "constituicao": 15}' },
    { nome: 'Débora', classe: 'Juíza', habilidade_nome: 'Canto da Vitória', habilidade_tipo: 'BUFF_OFENSIVO_GRUPO', habilidade_valor: 1.20, habilidade_descricao: 'Aumenta o dano de todos os aliados em 20% por 3 turnos.', atributos: '{"forca": 12, "destreza": 16, "constituicao": 13}' },
    { nome: 'Elias', classe: 'Profeta', habilidade_nome: 'Fogo Celestial', habilidade_tipo: 'DANO_AREA', habilidade_valor: 1.5, habilidade_descricao: 'Causa 150% do dano de Destreza em todos os inimigos.', atributos: '{"forca": 14, "destreza": 17, "constituicao": 12}' }
];

// --- LISTA DE ITENS ---
const items = [
    // Consumíveis
    { nome: 'Água do Poço de Jacó', tipo: 'Consumivel', raridade: 'Comum', efeito_tipo: 'CURA_PERCENTUAL', efeito_valor: 0.25, slot: null, classe_restrita: null },
    { nome: 'Pão da Presença', tipo: 'Consumivel', raridade: 'Raro', efeito_tipo: 'CURA_PERCENTUAL', efeito_valor: 0.50, slot: null, classe_restrita: null },
    { nome: 'Frasco de Bálsamo de Gileade', tipo: 'Consumivel', raridade: 'Epico', efeito_tipo: 'CURA_PERCENTUAL', efeito_valor: 0.75, slot: null, classe_restrita: null },
    { nome: 'Cura de Naamã', tipo: 'Consumivel', raridade: 'Lendario', efeito_tipo: 'CURA_PERCENTUAL', efeito_valor: 1.0, slot: null, classe_restrita: null },
    { nome: 'Maná do Céu', tipo: 'Consumivel', raridade: 'Raro', efeito_tipo: 'LEVEL_UP', efeito_valor: 1, slot: null, classe_restrita: null },
    
    // Equipamentos Gerais (Convencionais)
    { nome: 'Túnica de Linho', tipo: 'Equipamento', raridade: 'Comum', efeito_tipo: 'BUFF_CONSTITUICAO', efeito_valor: 2, slot: 'universal', classe_restrita: null },
    { nome: 'Cajado de Pastor', tipo: 'Equipamento', raridade: 'Comum', efeito_tipo: 'BUFF_FORCA', efeito_valor: 2, slot: 'universal', classe_restrita: null },
    { nome: 'Sandálias do Viajante', tipo: 'Equipamento', raridade: 'Incomum', efeito_tipo: 'BUFF_DESTREZA', efeito_valor: 3, slot: 'universal', classe_restrita: null },
    { nome: 'Cinto de Couro', tipo: 'Equipamento', raridade: 'Incomum', efeito_tipo: 'BUFF_FORCA', efeito_valor: 3, slot: 'universal', classe_restrita: null },
    { nome: 'Peitoral de Couro Batido', tipo: 'Equipamento', raridade: 'Raro', efeito_tipo: 'BUFF_CONSTITUICAO', efeito_valor: 6, slot: 'universal', classe_restrita: null },
    { nome: 'Anel de Sabedoria', tipo: 'Equipamento', raridade: 'Raro', efeito_tipo: 'BUFF_DESTREZA', efeito_valor: 5, slot: 'universal', classe_restrita: null },
    { nome: 'Amuleto do Leão', tipo: 'Equipamento', raridade: 'Epico', efeito_tipo: 'BUFF_FORCA', efeito_valor: 8, slot: 'universal', classe_restrita: null },
    { nome: 'Manto do Peregrino', tipo: 'Equipamento', raridade: 'Epico', efeito_tipo: 'BUFF_CONSTITUICAO', efeito_valor: 10, slot: 'universal', classe_restrita: null },
    
    // Equipamentos de Classe
    { nome: 'Espada de Anjo', tipo: 'Equipamento', raridade: 'Incomum', efeito_tipo: 'BUFF_FORCA', efeito_valor: 5, slot: 'classe', classe_restrita: 'Herói' },
    { nome: 'Harpa de Davi', tipo: 'Equipamento', raridade: 'Raro', efeito_tipo: 'BUFF_DESTREZA', efeito_valor: 8, slot: 'classe', classe_restrita: 'Pastor' },
    { nome: 'Queixada de Jumento', tipo: 'Equipamento', raridade: 'Épico', efeito_tipo: 'BUFF_FORCA', efeito_valor: 10, slot: 'classe', classe_restrita: 'Juiz' },
    { nome: 'Cetro Real', tipo: 'Equipamento', raridade: 'Lendario', efeito_tipo: 'BUFF_CONSTITUICAO', efeito_valor: 12, slot: 'classe', classe_restrita: 'Rainha' },
    { nome: 'Elmo de Josué', tipo: 'Equipamento', raridade: 'Raro', efeito_tipo: 'BUFF_CONSTITUICAO', efeito_valor: 8, slot: 'classe', classe_restrita: 'Guerreiro' },
    { nome: 'Martelo de Jael', tipo: 'Equipamento', raridade: 'Épico', efeito_tipo: 'BUFF_FORCA', efeito_valor: 9, slot: 'classe', classe_restrita: 'Juíza' },
    { nome: 'Manto de Elias', tipo: 'Equipamento', raridade: 'Lendario', efeito_tipo: 'BUFF_DESTREZA', efeito_valor: 15, slot: 'classe', classe_restrita: 'Profeta' },
    
    // Itens de Chefe
    { nome: 'Cetro do Faraó', tipo: 'Equipamento', raridade: 'Raro', efeito_tipo: 'BUFF_CONSTITUICAO', efeito_valor: 10, slot: 'universal', classe_restrita: null, is_boss_item: true },
    { nome: 'Coroa de Nabucodonosor', tipo: 'Equipamento', raridade: 'Epico', efeito_tipo: 'BUFF_FORCA', efeito_valor: 15, slot: 'universal', classe_restrita: null, is_boss_item: true },
    { nome: 'Fragmento de Sombra', tipo: 'Equipamento', raridade: 'Lendario', efeito_tipo: 'BUFF_DESTREZA', efeito_valor: 18, slot: 'universal', classe_restrita: null, is_boss_item: true }
];
async function criarTabelas() {
    const client = await pool.connect();
    try {
        await client.query('DROP TABLE IF EXISTS scores CASCADE;');
        await client.query('DROP TABLE IF EXISTS users CASCADE;');
        await client.query('DROP TABLE IF EXISTS inimigos CASCADE;');
        await client.query('DROP TABLE IF EXISTS items CASCADE;');
        await client.query('DROP TABLE IF EXISTS aliados CASCADE;');
        
        console.log('Tabelas antigas removidas (se existiam).');

        await client.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabela "users" criada com sucesso.');

        await client.query(`
            CREATE TABLE scores (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                score INT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabela "scores" criada com sucesso.');

        // Cria a tabela inimigos SEM a coluna loot_table
        await client.query(`
            CREATE TABLE inimigos (
                id SERIAL PRIMARY KEY, nome VARCHAR(100) NOT NULL UNIQUE, tipo VARCHAR(50) NOT NULL, nivel INT DEFAULT 1, 
                pontos_de_vida JSONB, atributos JSONB, xp_concedida INT
            );`);
        console.log('Tabela "inimigos" criada com sucesso.');

        // Adiciona uma coluna 'is_boss_item' para identificar itens de chefe
        await client.query(`
            CREATE TABLE items (
                id SERIAL PRIMARY KEY, nome VARCHAR(100) NOT NULL UNIQUE, tipo VARCHAR(50) NOT NULL, raridade VARCHAR(50) NOT NULL,
                efeito_tipo VARCHAR(50), efeito_valor REAL, slot VARCHAR(50), classe_restrita VARCHAR(50), is_boss_item BOOLEAN DEFAULT FALSE
            );`);
        console.log('Tabela "items" criada com sucesso.');

        await client.query(`CREATE TABLE aliados (id SERIAL PRIMARY KEY, nome VARCHAR(100) NOT NULL UNIQUE, classe VARCHAR(50) NOT NULL, habilidade_nome VARCHAR(100), habilidade_tipo VARCHAR(50), habilidade_descricao VARCHAR(200), habilidade_valor REAL, atributos JSONB);`);
        console.log('Tabela "aliados" criada com sucesso.');

        for (const item of items) {
            await client.query(`
                INSERT INTO items (nome, tipo, raridade, efeito_tipo, efeito_valor, slot, classe_restrita, is_boss_item)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
            `, [item.nome, item.tipo, item.raridade, item.efeito_tipo, item.efeito_valor, item.slot, item.classe_restrita, item.is_boss_item || false]);
        }
        console.log('Todos os itens foram inseridos com sucesso.');

        // Insere os inimigos SEM a loot_table
        for (const inimigo of inimigos) {
            await client.query(`
                INSERT INTO inimigos (nome, tipo, nivel, pontos_de_vida, atributos, xp_concedida) VALUES ($1, $2, $3, $4, $5, $6);
            `, [inimigo.nome, inimigo.tipo, inimigo.nivel, inimigo.pontos_de_vida, inimigo.atributos, inimigo.xp_concedida]);
        }
        console.log('Todos os inimigos foram inseridos com sucesso.');

        for (const aliado of aliados) {
            await client.query(`
                INSERT INTO aliados (nome, classe, habilidade_nome, habilidade_tipo, habilidade_valor, habilidade_descricao, atributos)
                VALUES ($1, $2, $3, $4, $5, $6, $7);
            `, [aliado.nome, aliado.classe, aliado.habilidade_nome, aliado.habilidade_tipo, aliado.habilidade_valor, aliado.habilidade_descricao, aliado.atributos]);
        }
        console.log('Todos os aliados foram inseridos com sucesso.');

    } catch (err) {
        console.error('Erro ao criar ou popular as tabelas:', err);
    } finally {
        client.release();
        pool.end();
    }
}

criarTabelas();