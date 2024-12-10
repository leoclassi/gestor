const express = require('express');
const router = express.Router();
const whatsappManager = require('../whatsapp-service');
const Contato = require('../models/Contato');

// Rota para buscar estatísticas
router.get('/stats', async (req, res) => {
    try {
        const totalContatos = await Contato.countDocuments();
        const contatosAtivos = await Contato.countDocuments({ aceitouMarketing: true });
        const grupos = await Contato.distinct('grupo');
        const mensagensEnviadas = await Contato.aggregate([
            { $group: { _id: null, total: { $sum: "$mensagensEnviadas" } } }
        ]);

        res.json({
            totalContatos,
            contatosAtivos,
            totalGrupos: grupos.length,
            mensagensEnviadas: mensagensEnviadas[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// Rota para listar contatos (com paginação)
router.get('/contatos', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', grupo = '' } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { nome: new RegExp(search, 'i') },
                { telefone: new RegExp(search, 'i') }
            ];
        }

        if (grupo) {
            query.grupo = grupo;
        }

        const contatos = await Contato.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ dataCadastro: -1 });

        const total = await Contato.countDocuments(query);

        res.json({
            contatos,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar contatos' });
    }
});

// Rota para adicionar contato
router.post('/contatos', async (req, res) => {
    try {
        const novoContato = new Contato(req.body);
        await novoContato.save();
        res.status(201).json(novoContato);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao adicionar contato' });
    }
});

// Rota para importar contatos em lote
router.post('/contatos/importar', async (req, res) => {
    try {
        const { contatos } = req.body;
        const resultado = await Contato.insertMany(contatos, { ordered: false });
        res.json({ success: true, importados: resultado.length });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao importar contatos' });
    }
});

// Rota para enviar mensagem
router.post('/enviar-mensagem', async (req, res) => {
    try {
        const { tipo, mensagem, grupo, contatoEspecifico, intervaloEnvio = 2000 } = req.body;
        let contatos = [];
        let sucessos = 0;
        let falhas = 0;
        const resultados = [];

        // Se for envio para contato específico
        if (contatoEspecifico) {
            const contato = await Contato.findOne({ telefone: contatoEspecifico });
            if (contato) {
                contatos = [contato];
            }
        } else {
            // Busca contatos baseado no grupo
            if (grupo && grupo !== 'todos') {
                contatos = await Contato.find({ 
                    grupo, 
                    ativo: true,
                    mensagensEnviadas: { $lt: 5 }
                });
            } else {
                contatos = await Contato.find({ 
                    ativo: true,
                    mensagensEnviadas: { $lt: 5 }
                });
            }
        }

        // Verifica se há contatos para enviar
        if (contatos.length === 0) {
            return res.json({ 
                success: false, 
                message: 'Nenhum contato encontrado para envio',
                resultados: [] 
            });
        }

        // Processa cada contato
        for (const contato of contatos) {
            try {
                // Aguarda o intervalo entre mensagens
                await new Promise(resolve => setTimeout(resolve, intervaloEnvio));

                // Envia a mensagem
                await whatsappManager.sendTextMessage(contato.telefone, mensagem);

                // Atualiza o contador de mensagens
                contato.mensagensEnviadas = (contato.mensagensEnviadas || 0) + 1;
                contato.ultimaMensagem = new Date();
                await contato.save();

                sucessos++;
                resultados.push({
                    nome: contato.nome,
                    telefone: contato.telefone,
                    status: 'sucesso'
                });

            } catch (error) {
                console.error(`Erro ao enviar mensagem para ${contato.nome} (${contato.telefone}):`, error);
                falhas++;
                resultados.push({
                    nome: contato.nome,
                    telefone: contato.telefone,
                    status: 'falha',
                    erro: error.message
                });
            }
        }

        res.json({
            success: true,
            total: contatos.length,
            sucessos,
            falhas,
            resultados
        });

    } catch (error) {
        console.error('Erro ao processar envio de mensagens:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao processar envio de mensagens',
            detalhes: error.message
        });
    }
});

// Rota para excluir contato
router.delete('/contatos/:id', async (req, res) => {
    try {
        await Contato.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir contato' });
    }
});

// Rota para atualizar contato
router.put('/contatos/:id', async (req, res) => {
    try {
        const contato = await Contato.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(contato);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar contato' });
    }
});

// Adicione esta linha para incluir as rotas de contatos
router.use('/api/contatos', require('./contatos'));

module.exports = router; 