const express = require('express');
const router = express.Router();
const whatsappManager = require('../whatsapp-service');

// Adicione este log para verificar se a rota está sendo registrada
console.log('Registrando rotas do WhatsApp...');

router.post('/send-pdf', async (req, res) => {
    let pdfBuffer = null;
    try {
        const { pdfData } = req.body;
        pdfBuffer = Buffer.from(pdfData, 'base64');
        const result = await whatsappManager.sendPdfMessage(phoneNumber, pdfBuffer, caption);
        res.json(result);
    } finally {
        // Ajuda o GC a liberar a memória
        pdfBuffer = null;
    }
});

router.get('/status', (req, res) => {
    console.log('Requisição de status recebida');
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Função para enviar atualizações para o cliente
    const sendUpdate = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        // Verifica o status inicial
        const currentStatus = whatsappManager.getStatus();
        console.log('Status atual:', currentStatus);

        if (currentStatus.isInitialized) {
            sendUpdate({ status: 'ready' });
        } else if (currentStatus.hasQrCode) {
            const qrCode = whatsappManager.getQrCode();
            if (qrCode) {
                sendUpdate({ 
                    status: 'qr', 
                    qr: qrCode.split(',')[1]
                });
            } else {
                sendUpdate({ status: 'connecting' });
            }
        } else {
            sendUpdate({ status: 'connecting' });
        }

        // Registra os listeners de eventos
        const qrListener = (qrCode) => {
            console.log('Novo QR Code recebido');
            sendUpdate({ 
                status: 'qr', 
                qr: qrCode.split(',')[1]
            });
        };

        const readyListener = () => {
            console.log('Cliente pronto');
            sendUpdate({ status: 'ready' });
        };

        const disconnectedListener = () => {
            console.log('Cliente desconectado');
            sendUpdate({ status: 'disconnected' });
        };

        // Adiciona os listeners ao WhatsApp manager
        whatsappManager.client.on('qr', qrListener);
        whatsappManager.client.on('ready', readyListener);
        whatsappManager.client.on('disconnected', disconnectedListener);

        // Remove os listeners quando a conexão for fechada
        req.on('close', () => {
            console.log('Conexão fechada, removendo listeners');
            whatsappManager.client.off('qr', qrListener);
            whatsappManager.client.off('ready', readyListener);
            whatsappManager.client.off('disconnected', disconnectedListener);
        });

    } catch (error) {
        console.error('Erro ao processar requisição de status:', error);
        res.status(500).end();
    }
});

router.get('/health', (req, res) => {
    try {
        const status = whatsappManager.getStatus();
        res.json({
            status: 'ok',
            whatsapp: status,
            puppeteer: {
                initialized: !!whatsappManager.client.pupPage,
                browser: !!whatsappManager.client.pupBrowser
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Adicione esta rota de teste
router.get('/test', (req, res) => {
    res.json({ status: 'WhatsApp routes working' });
});

module.exports = router; 