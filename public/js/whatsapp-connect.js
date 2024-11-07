class WhatsAppConnect {
    constructor() {
        this.statusIndicator = document.getElementById('statusIndicator');
        this.qrCodeContainer = document.getElementById('qrCode');
        this.refreshButton = document.getElementById('refreshButton');
        this.eventSource = null;
        
        this.initializeEventListeners();
        this.startConnection();
    }

    initializeEventListeners() {
        this.refreshButton.addEventListener('click', () => {
            this.startConnection();
        });

        window.addEventListener('online', () => this.startConnection());
        window.addEventListener('offline', () => this.updateStatus('disconnected'));
    }

    startConnection() {
        if (this.eventSource) {
            this.eventSource.close();
        }

        this.updateStatus('connecting');
        this.refreshButton.style.display = 'none';
        this.showLoading();

        this.eventSource = new EventSource('/api/whatsapp/status');

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received status update:', data); // Debug log
                this.handleStatusUpdate(data);
            } catch (error) {
                console.error('Error processing status update:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            this.eventSource.close();
            this.updateStatus('disconnected');
            this.refreshButton.style.display = 'block';
        };
    }

    showLoading() {
        this.qrCodeContainer.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="sr-only">Carregando...</span>
            </div>
            <p>Aguardando código QR...</p>
        `;
    }

    handleStatusUpdate(data) {
        switch (data.status) {
            case 'qr':
                this.displayQRCode(data.qr);
                this.updateStatus('connecting');
                break;
            
            case 'ready':
                this.updateStatus('connected');
                this.qrCodeContainer.innerHTML = `
                    <div class="text-success">
                        <i class="fas fa-check-circle fa-3x"></i>
                        <p class="mt-3">WhatsApp conectado com sucesso!</p>
                    </div>
                `;
                if (this.eventSource) {
                    this.eventSource.close();
                }
                break;
            
            case 'disconnected':
                this.updateStatus('disconnected');
                this.refreshButton.style.display = 'block';
                break;
        }
    }

    displayQRCode(qrData) {
        // Usa uma biblioteca QR code para gerar a imagem
        // Aqui estamos usando uma imagem base64 que vem do servidor
        this.qrCodeContainer.innerHTML = `
            <img src="data:image/png;base64,${qrData}" alt="QR Code" style="max-width: 100%">
            <p class="mt-3">Escaneie o código QR com seu WhatsApp</p>
        `;
    }

    updateStatus(status) {
        this.statusIndicator.className = 'status-indicator';
        
        switch (status) {
            case 'connecting':
                this.statusIndicator.classList.add('status-connecting');
                this.statusIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
                break;
            
            case 'connected':
                this.statusIndicator.classList.add('status-connected');
                this.statusIndicator.innerHTML = '<i class="fas fa-check-circle"></i> Conectado';
                break;
            
            case 'disconnected':
                this.statusIndicator.classList.add('status-disconnected');
                this.statusIndicator.innerHTML = '<i class="fas fa-times-circle"></i> Desconectado';
                break;
        }
    }
}

// Inicializa a classe quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new WhatsAppConnect();
}); 