class PixGenerator {
    static generatePix(pixKey, value, txid = '') {
        // Formatar a chave PIX (telefone) para o formato internacional
        const formattedPixKey = this.formatPhoneNumber(pixKey);
        
        // Função auxiliar para calcular CRC16
        function crc16(str) {
            const polynomial = 0x1021;
            let crc = 0xFFFF;
            
            for (let i = 0; i < str.length; i++) {
                crc ^= (str.charCodeAt(i) << 8);
                for (let j = 0; j < 8; j++) {
                    crc = ((crc & 0x8000) ? ((crc << 1) ^ polynomial) : (crc << 1)) & 0xFFFF;
                }
            }
            return crc;
        }

        // Função auxiliar para formatar campos
        function formatPixField(id, value) {
            if (!value) return '';
            const len = value.toString().length.toString().padStart(2, '0');
            return `${id}${len}${value}`;
        }

        // Dados do comerciante (use letras maiúsculas sem acentos)
        const merchantName = "PORTUGAL MADEIRAS";
        const merchantCity = "DUARTINA";
        
        // Formatar o valor para o padrão PIX (com ponto decimal)
        const formattedValue = value.toFixed(2);
        
        // Montar o payload do PIX
        let payload = '';
        
        // Payload Format Indicator (obrigatório, fixo "01")
        payload += formatPixField('00', '01');
        
        // Point of Initiation Method (fixo "11" para QR Code estático)
        payload += formatPixField('01', '11');
        
        // Merchant Account Information - PIX
        let pixInfo = '';
        pixInfo += formatPixField('00', 'br.gov.bcb.pix'); // GUI
        pixInfo += formatPixField('01', formattedPixKey); // Chave PIX (telefone formatado)
        payload += formatPixField('26', pixInfo);
        
        // Merchant Category Code (fixo "0000" para comerciantes em geral)
        payload += formatPixField('52', '0000');
        
        // Transaction Currency (fixo "986" para BRL)
        payload += formatPixField('53', '986');
        
        // Transaction Amount
        payload += formatPixField('54', formattedValue);
        
        // Country Code (fixo "BR")
        payload += formatPixField('58', 'BR');
        
        // Merchant Name
        payload += formatPixField('59', merchantName);
        
        // Merchant City
        payload += formatPixField('60', merchantCity);
        
        // Additional Data Field Template
        let additionalDataField = '';
        if (txid) {
            additionalDataField += formatPixField('05', txid);
        }
        if (additionalDataField) {
            payload += formatPixField('62', additionalDataField);
        }
        
        // CRC16 (preenchido após calcular)
        payload += '6304';
        
        // Calcular e adicionar o CRC16
        const crc = crc16(payload).toString(16).toUpperCase().padStart(4, '0');
        payload += crc;

        return payload;
    }

    // Função para formatar o número de telefone para o padrão PIX
    static formatPhoneNumber(phone) {
        // Remove todos os caracteres não numéricos
        let cleaned = phone.replace(/\D/g, '');
        
        // Se o número não começar com +55, adiciona
        if (!cleaned.startsWith('55')) {
            cleaned = '55' + cleaned;
        }
        
        // Adiciona o + no início
        return '+' + cleaned;
    }

    static async generateQRCode(pixCode) {
        return new Promise((resolve) => {
            const qrcode = new QRCode(document.createElement('div'), {
                text: pixCode,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            
            // Retorna a URL da imagem em base64
            const base64Image = qrcode._el.firstChild.toDataURL('image/png');
            resolve(base64Image);
        });
    }
} 