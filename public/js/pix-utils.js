class PixGenerator {
    static formatField(id, value) {
        const len = value.toString().length.toString().padStart(2, '0');
        return `${id}${len}${value}`;
    }

    static crc16(str) {
        let crc = 0xFFFF;
        for (let c = 0; c < str.length; c++) {
            crc ^= str.charCodeAt(c) << 8;
            for (let i = 0; i < 8; i++) {
                if (crc & 0x8000) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc = crc << 1;
                }
                crc &= 0xFFFF;
            }
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    static generatePix(key, value, txId = '') {
        let payload = "000201";
        payload += this.formatField("26", "0014br.gov.bcb.pix" + this.formatField("01", key));
        payload += "52040000";
        payload += "5303986";
        
        if (value > 0) {
            payload += this.formatField("54", value.toFixed(2));
        }
        
        payload += "5802BR";
        payload += "5913Portugal Made";
        payload += "6008Duartina";
        payload += this.formatField("62", this.formatField("05", txId || '***'));
        payload += "6304";
        
        const crc = this.crc16(payload);
        return payload + crc;
    }

    static generateQRCode(pixCode) {
        return new Promise((resolve) => {
            // Criar um elemento temporário para o QR Code
            const qrContainer = document.createElement('div');
            
            // Criar o QR Code
            new QRCode(qrContainer, {
                text: pixCode,
                width: 300,
                height: 300,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // Obter a imagem do QR Code
            const qrImage = qrContainer.querySelector('img');
            resolve(qrImage.src);
        });
    }
} 