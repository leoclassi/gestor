const express = require('express');
const router = express.Router();
const whatsappManager = require('../whatsapp-service');
const { MessageMedia } = require('whatsapp-web.js');

console.log('Registrando rotas do WhatsApp...');

// Rota de teste
router.get('/test', (req, res) => {
    res.json({ status: 'WhatsApp routes working' });
});

// Rota para enviar PDF
router.post('/send-pdf', async (req, res) => {
    try {
        const { phoneNumber, pdfData, caption, fileName } = req.body;
        
        console.log(`Número do telefone recebido: ${phoneNumber}`);
        console.log(`Tamanho dos dados recebidos: ${pdfData.length / (1024 * 1024)} MB`);
        console.log(`Nome do arquivo: ${fileName}`);
        
        const pdfBuffer = Buffer.from(pdfData, 'base64');
        
        const safeFileName = fileName || 'documento';
        
        const result = await whatsappManager.sendPdfMessage(
            phoneNumber, 
            pdfBuffer, 
            caption, 
            safeFileName
        );
        
        res.json(result);
    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao enviar PDF pelo WhatsApp'
        });
    }
});

// Rota para status do WhatsApp
router.get('/status', (req, res) => {
    console.log('Requisição de status recebida');
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const sendUpdate = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
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

        const qrListener = (qrCode) => {
            console.log('Novo QR Code recebido');
            sendUpdate({ 
                status: 'qr', 
                qr: qrCode.split(',')[1]
            });
        };

        whatsappManager.client.on('qr', qrListener);
        whatsappManager.client.on('ready', () => sendUpdate({ status: 'ready' }));
        whatsappManager.client.on('disconnected', () => sendUpdate({ status: 'disconnected' }));

        req.on('close', () => {
            whatsappManager.client.off('qr', qrListener);
        });

    } catch (error) {
        console.error('Erro ao processar requisição de status:', error);
        res.status(500).end();
    }
});

// Atualizar a rota send-pix-info
router.post('/send-pix-info', async (req, res) => {
    try {
        const { phoneNumber, pixCode } = req.body;
        
        // Primeiro envia a mensagem de agradecimento mais elaborada
        await whatsappManager.sendTextMessage(
            phoneNumber, 
            "Agradecemos a preferência em comprar na *Portugal Madeiras*! 🌳\n\n" +
            "Segue abaixo o código PIX *Copia e Cola* para realizar o pagamento.\n\n" +
            "Qualquer dúvida, estamos à disposição! 📞"
        );

        // Depois envia o código PIX
        const result = await whatsappManager.sendTextMessage(phoneNumber, pixCode);
        
        res.json(result);
    } catch (error) {
        console.error('Erro ao processar requisição de PIX:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao enviar informações do PIX'
        });
    }
});

// Certifique-se de exportar o router
module.exports = router; 