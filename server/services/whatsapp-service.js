const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');

class WhatsAppManager {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                headless: true
            }
        });
        
        // Adicionar flag para controlar o estado da conexão
        this.isInitialized = false;
        this.qrCode = null;
        
        this.initializeClient();
    }

    async initializeClient() {
        try {
            // Eventos do cliente
            this.client.on('qr', async (qr) => {
                try {
                    console.log('Novo QR Code recebido');
                    this.qrCode = await qrcode.toDataURL(qr);
                    // Emite o evento com a imagem do QR code completa
                    this.client.emit('qr', this.qrCode);
                } catch (error) {
                    console.error('Erro ao gerar QR code:', error);
                }
            });

            this.client.on('ready', () => {
                console.log('Cliente WhatsApp está pronto!');
                this.isInitialized = true;
            });

            this.client.on('authenticated', () => {
                console.log('WhatsApp autenticado!');
            });

            this.client.on('disconnected', () => {
                console.log('WhatsApp desconectado!');
                this.isInitialized = false;
                // Reinicializa o cliente quando desconectado
                this.client.initialize();
            });

            await this.client.initialize();
        } catch (error) {
            console.error('Erro ao inicializar cliente WhatsApp:', error);
            throw error;
        }
    }

    // Método para obter o QR code atual
    getQrCode() {
        return this.qrCode;
    }

    // Método para verificar o status da conexão
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasQrCode: !!this.qrCode
        };
    }

    async sendPdfMessage(phoneNumber, pdfBuffer, caption) {
        try {
            // Garante que o número está no formato correto
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            
            // Envia o PDF como documento
            const media = new MessageMedia('application/pdf', pdfBuffer.toString('base64'), caption);
            await this.client.sendMessage(`${formattedNumber}@c.us`, media, {
                caption: caption
            });

            return { success: true, message: 'PDF enviado com sucesso' };
        } catch (error) {
            console.error('Erro ao enviar PDF:', error);
            return { success: false, message: error.message };
        }
    }

    formatPhoneNumber(phone) {
        // Remove caracteres não numéricos
        let cleaned = phone.replace(/\D/g, '');
        
        // Adiciona código do país se necessário
        if (!cleaned.startsWith('55')) {
            cleaned = '55' + cleaned;
        }
        
        return cleaned;
    }
}

module.exports = new WhatsAppManager(); 