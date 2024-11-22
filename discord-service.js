const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;
const moment = require('moment');
require('moment/locale/pt-br');
moment.locale('pt-br');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let isReady = false;
const usersFile = path.join(__dirname, 'data', 'users.json');
const salesFile = path.join(__dirname, 'data', 'sales.json');

let statusMessage = null; // Armazenar referência da mensagem de status

// Função auxiliar para ler arquivo JSON
async function readJSONFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading file from disk: ${error}`);
        return [];
    }
}

client.once('ready', () => {
    console.log(`Bot do Discord conectado como ${client.user.tag}`);
    isReady = true;
});

async function sendChannelMessage(channelId, message) {
    if (!isReady) {
        throw new Error('Bot ainda não está pronto');
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (channel) {
            await channel.send(message);
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        throw error;
    }
}

async function sendChannelEmbed(channelId, embedData) {
    if (!isReady) {
        console.warn('Bot ainda não está pronto');
        return;
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            console.error('Canal não encontrado:', channelId);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(embedData.title)
            .setDescription(embedData.description)
            .setColor(embedData.color || '#0099ff');

        if (embedData.fields) {
            embed.addFields(embedData.fields);
        }

        if (embedData.timestamp) {
            embed.setTimestamp();
        }

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`Erro ao enviar embed para o canal ${channelId}:`, error);
        // Não propaga o erro para evitar que o processo quebre
    }
}

function initializeBot(token) {
    if (!token) {
        throw new Error('Token do Discord não fornecido');
    }
    client.login(token);
}

async function updateActiveUsersStatus(channelId, sessionManager) {
    if (!isReady) return;

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const activeSessions = sessionManager.getActiveSessions();
        const users = await readJSONFile(usersFile);

        const embed = new EmbedBuilder()
            .setTitle('👥 Usuários Ativos')
            .setDescription(activeSessions.length > 0 ? 
                'Usuários conectados no momento:' : 
                'Nenhum usuário conectado no momento')
            .setColor('#00ff00')
            .setTimestamp();

        activeSessions.forEach(session => {
            const user = users.find(u => u.id === session.userId);
            const connectedFor = Math.floor((Date.now() - session.connectedAt) / 60000);
            
            embed.addFields({
                name: session.username,
                value: `🕒 Conectado há ${connectedFor} minutos\n` +
                      `👑 ${user?.isAdmin ? 'Administrador' : 'Usuário comum'}`,
                inline: true
            });
        });

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Erro ao atualizar status de usuários ativos:', error);
    }
}

// Função para criar ou atualizar a mensagem de status
async function updateStatusMessage(sessionManager) {
    if (!isReady) return;

    try {
        const channelId = '1291761477413240852';
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const users = await readJSONFile(usersFile);
        const activeSessions = sessionManager.getActiveSessions();

        const embed = new EmbedBuilder()
            .setTitle('👥 Painel de Status dos Usuários')
            .setColor('#2b2d31');

        // Adicionar campos para cada usuário
        const userStatusList = users.map(user => {
            const session = activeSessions.find(s => s.userId === user.id);
            const isAdmin = user.isAdmin ? ' 👑' : '';
            const status = session ? '🟢' : '🔴';
            const statusText = session ? 'Online' : 'Offline';
            const ip = session?.ip || 'N/A';
            
            let lastSeen;
            if (session) {
                lastSeen = 'Agora';
            } else {
                lastSeen = user.lastSeen 
                    ? `Visto por último ${moment(user.lastSeen).fromNow()}`
                    : 'Sem registro';
            }

            return `${status} **${user.username}**${isAdmin}\n` +
                   `Status: ${statusText}\n` +
                   `IP: ${ip}\n` +
                   `${session ? 'Online' : lastSeen}`;
        });

        // Adicionar campos ao embed
        userStatusList.forEach(userStatus => {
            embed.addFields({ 
                name: '\u200B', // Caractere invisível para separação
                value: userStatus, 
                inline: true 
            });
        });

        // Adicionar timestamp como footer
        embed.setFooter({ 
            text: `Última atualização • ${moment().format('HH:mm')}` 
        });

        // Atualizar ou criar mensagem
        if (statusMessage) {
            await statusMessage.edit({ embeds: [embed] });
        } else {
            statusMessage = await channel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Erro ao atualizar mensagem de status:', error);
    }
}

// Modificar a função setupSessionListeners para incluir a atualização periódica
function setupSessionListeners(sessionManager) {
    // Atualizar a mensagem de status a cada 30 segundos
    setInterval(() => {
        try {
            updateStatusMessage(sessionManager).catch(error => {
                console.error('Erro ao atualizar mensagem de status:', error);
            });
        } catch (error) {
            console.error('Erro no intervalo de atualização:', error);
        }
    }, 30000);

    // Atualizar imediatamente quando um usuário conecta ou desconecta
    sessionManager.on('userConnected', async (session) => {
        try {
            await updateStatusMessage(sessionManager);
        } catch (error) {
            console.error('Erro no evento userConnected:', error);
        }
    });

    sessionManager.on('userDisconnected', async (session) => {
        try {
            await updateStatusMessage(sessionManager);
        } catch (error) {
            console.error('Erro no evento userDisconnected:', error);
        }
    });

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        if (message.content === '!vendas') {
            try {
                const sales = await readJSONFile(salesFile);
                const recentSales = sales.slice(-5);

                const embed = new EmbedBuilder()
                    .setTitle('📊 Vendas Recentes')
                    .setColor('#0099ff');

                recentSales.forEach(sale => {
                    embed.addFields({
                        name: `Venda #${sale.numero}`,
                        value: `Cliente: ${sale.cliente}\nValor: R$ ${sale.valorTotal.toFixed(2)}`
                    });
                });

                message.channel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Erro ao buscar vendas:', error);
                message.reply('Erro ao buscar vendas recentes.');
            }
        }

        if (message.content === '!status') {
            const embed = new EmbedBuilder()
                .setTitle('🟢 Status do Sistema')
                .setDescription('Sistema operacional e respondendo')
                .setColor('#00ff00')
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        }

        if (message.content === '!usuarios') {
            await updateActiveUsersStatus(message.channel.id, sessionManager);
        }
    });
}

module.exports = {
    initializeBot,
    sendChannelMessage,
    sendChannelEmbed,
    setupSessionListeners,
    updateStatusMessage,
    client
}; 