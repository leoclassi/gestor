const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const CONTATOS_FILE = path.join(__dirname, '../data/contatos.json');

// Carregar contatos
router.get('/', async (req, res) => {
    try {
        const data = await fs.readFile(CONTATOS_FILE, 'utf8');
        const contatos = JSON.parse(data || '[]');
        res.json(contatos);
    } catch (error) {
        console.error('Erro ao ler contatos:', error);
        res.status(500).json({ error: 'Erro ao ler contatos' });
    }
});

// Salvar contatos
router.post('/', async (req, res) => {
    try {
        await fs.writeFile(CONTATOS_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar contatos:', error);
        res.status(500).json({ error: 'Erro ao salvar contatos' });
    }
});

module.exports = router; 