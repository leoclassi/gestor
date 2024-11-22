document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    
    if (token) {
        try {
            const tokenParts = token.split('.');
            const payload = JSON.parse(atob(tokenParts[1]));
            
            // Obter IP público
            const publicIP = await getPublicIP();
            
            // Iniciar sessão
            await fetch('/api/session/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: payload.id,
                    username: payload.username,
                    ip: publicIP
                })
            });

            // Configurar heartbeat
            const heartbeatInterval = setInterval(async () => {
                try {
                    await fetch('/api/session/heartbeat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ userId: payload.id })
                    });
                } catch (error) {
                    console.error('Erro no heartbeat:', error);
                    clearInterval(heartbeatInterval);
                }
            }, 20000);

            // Configurar cleanup
            window.addEventListener('beforeunload', async () => {
                clearInterval(heartbeatInterval);
                await fetch('/api/session/end', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ userId: payload.id })
                });
            });
        } catch (error) {
            console.error('Erro ao iniciar sessão:', error);
        }
    }
});

async function getPublicIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Erro ao obter IP público:', error);
        return null;
    }
} 