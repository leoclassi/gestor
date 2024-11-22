const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class SessionManager extends EventEmitter {
    constructor() {
        super();
        this.sessions = new Map(); // Armazena as sessões ativas
        this.heartbeatInterval = 30000; // 30 segundos
        this.timeoutThreshold = 60000; // 1 minuto
        this.usersFile = path.join(__dirname, 'data', 'users.json');

        // Verificar sessões expiradas a cada 30 segundos
        setInterval(() => this.checkExpiredSessions(), 30000);
    }

    // Função auxiliar para ler arquivo JSON
    async readJSONFile(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading file from disk: ${error}`);
            return [];
        }
    }

    // Registrar nova sessão ou atualizar existente
    updateSession(userId, username, ip) {
        const now = Date.now();
        const existingSession = this.sessions.get(userId);
        
        console.log('📝 Atualizando sessão:', {
            userId,
            username,
            ip,
            timestamp: new Date(now).toISOString()
        });
        
        if (!existingSession) {
            console.log('🆕 Nova sessão criada para:', username);
            this.emit('userConnected', { userId, username, ip });
        }

        const session = {
            userId,
            username,
            ip,
            lastHeartbeat: now,
            connectedAt: existingSession?.connectedAt || now
        };

        this.sessions.set(userId, session);
        console.log('📊 Sessões ativas:', Array.from(this.sessions.entries()));
    }

    // Receber heartbeat do cliente
    heartbeat(userId) {
        console.log('💓 Heartbeat recebido para usuário:', userId);
        const session = this.sessions.get(userId);
        if (session) {
            session.lastHeartbeat = Date.now();
            this.sessions.set(userId, session);
            console.log('✅ Heartbeat processado com sucesso');
        } else {
            console.log('⚠️ Sessão não encontrada para heartbeat');
        }
    }

    // Verificar sessões expiradas
    checkExpiredSessions() {
        const now = Date.now();
        for (const [userId, session] of this.sessions.entries()) {
            if (now - session.lastHeartbeat > this.timeoutThreshold) {
                this.removeSession(userId).catch(error => {
                    console.error('Erro ao remover sessão expirada:', error);
                });
            }
        }
    }

    // Obter todas as sessões ativas
    getActiveSessions() {
        return Array.from(this.sessions.values());
    }

    // Remover sessão específica
    async removeSession(userId) {
        const session = this.sessions.get(userId);
        if (session) {
            try {
                // Atualizar o último acesso no arquivo de usuários
                const users = await this.readJSONFile(this.usersFile);
                const userIndex = users.findIndex(u => u.id === userId);
                
                if (userIndex !== -1) {
                    // Atualizar o lastSeen no objeto do usuário
                    users[userIndex].lastSeen = new Date().toISOString();
                    
                    // Salvar a atualização no arquivo
                    await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2), 'utf8');
                    console.log(`Último acesso atualizado para ${users[userIndex].username}: ${users[userIndex].lastSeen}`);
                }

                // Remover a sessão e emitir o evento de desconexão
                this.sessions.delete(userId);
                this.emit('userDisconnected', {
                    ...session,
                    disconnectedAt: new Date().toISOString() // Adicionar timestamp de desconexão
                });
            } catch (error) {
                console.error('Erro ao atualizar último acesso:', error);
            }
        }
    }

    // Método para debug
    getSessionInfo(userId) {
        const session = this.sessions.get(userId);
        console.log('Session info for', userId, ':', session);
        return session;
    }
}

module.exports = new SessionManager(); 