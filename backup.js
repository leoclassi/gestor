const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const axios = require('axios');
const FormData = require('form-data');
const schedule = require('node-schedule'); // Importando node-schedule

require('dotenv').config();
const WEBHOOK_URL = process.env.WEBHOOK_URL;

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
    const zip = new AdmZip();
    const formattedDate = getFormattedDate(); // Obter a data formatada
    const outputFile = path.join(__dirname, 'public', 'backups', `Backup_${formattedDate}.zip`); // Novo nome de arquivo
    const filesToBackup = ['cheques.json', 'products.json', 'clients.json', 'config.json', 'sales.json', 'users.json', 'budgets.json'];

    filesToBackup.forEach(file => {
        const filePath = path.join(__dirname, 'data', file);
        if (fs.existsSync(filePath)) {
            zip.addLocalFile(filePath);
        }
    });

    zip.writeZip(outputFile);
    return outputFile;
}

async function sendBackupToDiscord(filePath) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
        filename: path.basename(filePath)
    });

    try {
        await axios.post(WEBHOOK_URL, form, {
            headers: {
                ...form.getHeaders(),
                'Content-Type': 'multipart/form-data'
            }
        });
        console.log('Backup enviado para o Discord com sucesso.');
    } catch (error) {
        console.error('Erro ao enviar backup para o Discord:', error.message);
        throw error;
    }
}

async function performBackup() {
    try {
        const backupFile = createBackup();
        await sendBackupToDiscord(backupFile);
        fs.unlinkSync(backupFile); // Remove o arquivo zip local após o envio
        cleanOldBackups(30); // Remove backups com mais de 30 dias
        return { success: true, message: 'Backup realizado e enviado com sucesso' };
    } catch (error) {
        console.error('Erro ao realizar backup:', error);
        return { success: false, message: 'Erro ao realizar backup: ' + error.message };
    }
}

// Função para limpar backups antigos (mais de 30 dias)
function cleanOldBackups(days = 30) {
    const backupPath = path.join(__dirname, 'public', 'backups');
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    fs.readdir(backupPath, (err, files) => {
        if (err) {
            return console.error('Erro ao ler a pasta de backups:', err);
        }

        files.forEach(file => {
            const filePath = path.join(backupPath, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    return console.error('Erro ao obter estatísticas do arquivo:', err);
                }

                if (stats.mtimeMs < cutoff) {
                    fs.unlink(filePath, err => {
                        if (err) {
                            return console.error('Erro ao remover arquivo antigo:', err);
                        }
                        console.log(`Backup antigo removido: ${file}`);
                    });
                }
            });
        });
    });
}

// Agendar a limpeza semanalmente (por exemplo, todo domingo às 01:00)
schedule.scheduleJob('0 1 * * 0', () => {
    cleanOldBackups(30); // Remove backups com mais de 30 dias
});

module.exports = { performBackup };
