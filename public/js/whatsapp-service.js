class WhatsAppService {
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

    async sendThankYouMessage(phoneNumber) {
        try {
            const response = await fetch('/api/whatsapp/send-thank-you', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao enviar mensagem de agradecimento');
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao enviar mensagem de agradecimento:', error);
            throw error;
        }
    }
}