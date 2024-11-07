const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');

class WhatsAppManager {
    constructor() {
        console.log('Iniciando WhatsAppManager...');
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });
        
        this.isInitialized = false;
        this.qrCode = null;
        this.isReady = false;
        
        this.initializeClient();
    }

    async initializeClient() {
        try {
            console.log('Iniciando configuração dos eventos do cliente...');

            this.client.on('qr', async (qr) => {
                try {
                    console.log('QR Code recebido, convertendo para URL...');
                    this.qrCode = await qrcode.toDataURL(qr);
                    console.log('QR Code convertido com sucesso');
                } catch (error) {
                    console.error('Erro ao gerar QR code:', error);
                }
            });

            this.client.on('ready', () => {
                console.log('Cliente WhatsApp está pronto!');
                this.isInitialized = true;
                this.isReady = true;
            });

            this.client.on('authenticated', () => {
                console.log('WhatsApp autenticado com sucesso!');
            });

            this.client.on('auth_failure', (err) => {
                console.error('Falha na autenticação:', err);
                this.isInitialized = false;
                this.isReady = false;
                setTimeout(() => this.initializeClient(), 5000);
            });

            this.client.on('disconnected', (reason) => {
                console.log('WhatsApp desconectado. Razão:', reason);
                this.isInitialized = false;
                this.isReady = false;
                this.qrCode = null;
                setTimeout(() => this.initializeClient(), 5000);
            });

            console.log('Iniciando cliente WhatsApp...');
            await this.client.initialize();
            console.log('Cliente inicializado com sucesso');

        } catch (error) {
            console.error('Erro fatal ao inicializar cliente WhatsApp:', error);
            setTimeout(() => this.initializeClient(), 5000);
        }
    }

    async waitForReady(timeout = 30000) {
        const startTime = Date.now();
        while (!this.isReady && Date.now() - startTime < timeout) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('Aguardando cliente ficar pronto...');
        }
        if (!this.isReady) {
            throw new Error('Timeout esperando WhatsApp ficar pronto');
        }
    }

    async sendPdfMessage(to, pdfBuffer, caption, fileName) {
        try {
            const formattedNumber = this.formatPhoneNumber(to);
            const chat = await this.client.getChatById(formattedNumber);
            
            const safeFileName = fileName || 'documento';
            
            const media = new MessageMedia(
                'application/pdf',
                pdfBuffer.toString('base64'),
                `${safeFileName.toString().replace(/^venda[_\s-]*/i, '')}.pdf`
            );

            await chat.sendMessage(media);
            return { success: true };
        } catch (error) {
            console.error('Erro ao enviar PDF:', error);
            throw error;
        }
    }

    async sendMediaWithCaption(to, media, caption) {
        try {
            const formattedNumber = this.formatPhoneNumber(to);
            const chat = await this.client.getChatById(formattedNumber);
            
            await chat.sendMessage(media, { caption });
            return { success: true };
        } catch (error) {
            console.error('Erro ao enviar mídia com legenda:', error);
            throw error;
        }
    }

    formatPhoneNumber(phone) {
        let cleaned = phone.replace(/\D/g, '');
        if (!cleaned.startsWith('55')) {
            cleaned = '55' + cleaned;
        }
        return cleaned + '@c.us';
    }

    getQrCode() {
        return this.qrCode;
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasQrCode: !!this.qrCode,
            isReady: this.isReady
        };
    }

    async sendPixMessage(phoneNumber, media, message) {
        try {
            await this.waitForReady();
            
            if (!this.client || !this.isReady) {
                throw new Error('Cliente WhatsApp não está pronto');
            }

            const chat = await this.client.getChatById(`${phoneNumber}@c.us`);
            
            // Primeiro envia a imagem do QR Code com a primeira parte da mensagem
            await chat.sendMessage(media, { caption: '*QR Code para pagamento PIX*' });
            
            // Depois envia a mensagem com o código copia e cola
            await chat.sendMessage(message);

            return { success: true, message: 'Informações do PIX enviadas com sucesso' };
        } catch (error) {
            console.error('Erro ao enviar informações do PIX:', error);
            return { success: false, message: error.message };
        }
    }

    async sendTextMessage(to, message) {
        try {
            const formattedNumber = this.formatPhoneNumber(to);
            const chat = await this.client.getChatById(formattedNumber);
            
            await chat.sendMessage(message);
            return { success: true };
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            throw error;
        }
    }
}

const whatsappManager = new WhatsAppManager();
module.exports = whatsappManager;