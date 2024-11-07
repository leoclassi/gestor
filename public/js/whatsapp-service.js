class WhatsAppService {
    constructor() {
        // Token de acesso da API do WhatsApp Business
        this.accessToken = 'SEU_TOKEN_AQUI';
        this.apiVersion = 'v17.0';
        this.phoneNumberId = 'SEU_PHONE_NUMBER_ID';
        this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
    }

    async sendPdfToWhatsApp(pdfBlob, phoneNumber, caption, fileName) {
        try {
            // Converter o Blob para base64
            const reader = new FileReader();
            const base64Data = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(pdfBlob);
            });

            const response = await fetch('/api/whatsapp/send-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber,
                    pdfData: base64Data,
                    caption: caption,
                    fileName: fileName
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao enviar PDF pelo WhatsApp');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao enviar PDF:', error);
            throw error;
        }
    }

    async sendPixInfo(phoneNumber, pixCode) {
        try {
            const response = await fetch('/api/whatsapp/send-pix-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber,
                    pixCode
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao enviar informações do PIX');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao enviar informações do PIX:', error);
            throw error;
        }
    }
} 