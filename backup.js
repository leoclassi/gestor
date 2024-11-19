const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const axios = require('axios');
const FormData = require('form-data');
const schedule = require('node-schedule');

require('dotenv').config();
const BACKUP_WEBHOOK_URL = process.env.BACKUP_WEBHOOK_URL;

// Função para criar diretórios se não existirem
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Função para formatar a data
function getFormattedDate() {
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const ano = now.getFullYear();
    return `${dia}_${mes}_${ano}`;
}

// Função para criar o backup
function createBackup() {
    try {
        const zip = new AdmZip();
        const formattedDate = getFormattedDate();
        
        // Garantir que o diretório de backups existe
        const backupDir = path.join(__dirname, 'public', 'backups');
        ensureDirectoryExists(backupDir);
        
        const outputFile = path.join(backupDir, `Backup_${formattedDate}.zip`);
        const filesToBackup = [
            'cheques.json',
            'products.json',
            'clients.json',
            'config.json',
            'sales.json',
            'users.json',
            'budgets.json',
            'remetentes.json',
            'boletos.json'
        ];

        // Verificar e adicionar cada arquivo ao zip
        filesToBackup.forEach(file => {
            const filePath = path.join(__dirname, 'data', file);
            if (fs.existsSync(filePath)) {
                zip.addLocalFile(filePath);
            } else {
                console.warn(`Arquivo não encontrado: ${file}`);
            }
        });

        // Criar o arquivo zip
        zip.writeZip(outputFile);
        console.log(`Backup criado em: ${outputFile}`);
        return outputFile;
    } catch (error) {
        console.error('Erro ao criar backup:', error);
        throw error;
    }
}

async function sendBackupToDiscord(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo de backup não encontrado: ${filePath}`);
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
        filename: path.basename(filePath)
    });

    try {
        const response = await axios.post(BACKUP_WEBHOOK_URL, form, {
            headers: {
                ...form.getHeaders(),
                'Content-Type': 'multipart/form-data'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        console.log('Backup enviado para o Discord com sucesso.');
        return response;
    } catch (error) {
        console.error('Erro ao enviar backup para o Discord:', error.message);
        throw error;
    }
}

async function performBackup() {
    try {
        // Garantir que o diretório data existe
        ensureDirectoryExists(path.join(__dirname, 'data'));
        
        const backupFile = createBackup();
        await sendBackupToDiscord(backupFile);
        
        // Remover arquivo local após envio bem-sucedido
        if (fs.existsSync(backupFile)) {
            fs.unlinkSync(backupFile);
        }
        
        cleanOldBackups(30);
        return { success: true, message: 'Backup realizado e enviado com sucesso' };
    } catch (error) {
        console.error('Erro ao realizar backup:', error);
        return { 
            success: false, 
            message: 'Erro ao realizar backup: ' + error.message,
            error: error.stack
        };
    }
}

// Função para limpar backups antigos
function cleanOldBackups(days = 30) {
    try {
        const backupPath = path.join(__dirname, 'public', 'backups');
        if (!fs.existsSync(backupPath)) return;

        const now = Date.now();
        const cutoff = now - days * 24 * 60 * 60 * 1000;

        fs.readdir(backupPath, (err, files) => {
            if (err) {
                console.error('Erro ao ler a pasta de backups:', err);
                return;
            }

            files.forEach(file => {
                const filePath = path.join(backupPath, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) {
                        console.error('Erro ao obter estatísticas do arquivo:', err);
                        return;
                    }

                    if (stats.mtimeMs < cutoff) {
                        fs.unlink(filePath, err => {
                            if (err) {
                                console.error('Erro ao remover arquivo antigo:', err);
                                return;
                            }
                            console.log(`Backup antigo removido: ${file}`);
                        });
                    }
                });
            });
        });
    } catch (error) {
        console.error('Erro ao limpar backups antigos:', error);
    }
}

// Agendar a limpeza semanalmente
schedule.scheduleJob('0 1 * * 0', () => {
    cleanOldBackups(30);
});

module.exports = { performBackup };
