const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 3000;
const axios = require('axios');
const crypto = require('crypto');
const schedule = require('node-schedule');
const { performBackup } = require('./backup');
const multer = require('multer');
const AdmZip = require('adm-zip');
const moment = require('moment-timezone');

const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.json());

const productsFile = path.join(__dirname, 'data', 'products.json');
const clientsFile = path.join(__dirname, 'data', 'clients.json');
const salesFile = path.join(__dirname, 'data', 'sales.json');
const chequesFile = path.join(__dirname, 'data', 'cheques.json');
require('dotenv').config();
const SECRET_KEY = process.env.SECRET_KEY;

// Adicione esta função auxiliar no início do arquivo
function formatDate(date) {
    return date.toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

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

// Função auxiliar para escrever arquivo JSON
async function writeJSONFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error writing file to disk: ${error}`);
    }
}

// Função para ler o arquivo de configuração
async function readConfig() {
    return JSON.parse(await fs.readFile(path.join(__dirname, 'data', 'config.json'), 'utf8'));
}

// Rota para verificar a senha
app.post('/api/verify-password', async (req, res) => {
    try {
        const { password } = req.body;
        const config = await readConfig();
        
        // Calcula o hash da senha fornecida
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        
        // Compara com o hash armazenado
        if (hash === config.passwordHash) {
            res.json({ success: true });
        } else {
            res.json({ success: false });
        }
    } catch (error) {
        console.error('Erro ao verificar a senha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rotas para produtos
app.get('/api/products', async (req, res) => {
    const products = await readJSONFile(productsFile);
    res.json(products);
});

app.post('/api/products', async (req, res) => {
    const products = await readJSONFile(productsFile);
    const newProduct = req.body;
    newProduct.id = Date.now().toString();
    products.push(newProduct);
    await writeJSONFile(productsFile, products);
    res.json(newProduct);
});

app.put('/api/products/:id', async (req, res) => {
    const products = await readJSONFile(productsFile);
    const index = products.findIndex(p => p.id === req.params.id);
    if (index !== -1) {
        products[index] = { ...products[index], ...req.body };
        await writeJSONFile(productsFile, products);
        res.json(products[index]);
    } else {
        res.status(404).json({ error: 'Product not found' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    const products = await readJSONFile(productsFile);
    const filteredProducts = products.filter(p => p.id !== req.params.id);
    await writeJSONFile(productsFile, filteredProducts);
    res.json({ message: 'Product deleted' });
});

// Rotas para clientes
app.get('/api/clients', async (req, res) => {
    const clients = await readJSONFile(clientsFile);
    res.json(clients);
});

app.post('/api/clients', async (req, res) => {
    const clients = await readJSONFile(clientsFile);
    const newClient = req.body;
    newClient.id = Date.now().toString();
    clients.push(newClient);
    await writeJSONFile(clientsFile, clients);
    res.json(newClient);
});

app.put('/api/clients/:id', async (req, res) => {
    const clients = await readJSONFile(clientsFile);
    const index = clients.findIndex(c => c.id === req.params.id);
    if (index !== -1) {
        clients[index] = { ...clients[index], ...req.body };
        await writeJSONFile(clientsFile, clients);
        res.json(clients[index]);
    } else {
        res.status(404).json({ error: 'Client not found' });
    }
});

app.delete('/api/clients/:id', async (req, res) => {
    const clients = await readJSONFile(clientsFile);
    const filteredClients = clients.filter(c => c.id !== req.params.id);
    await writeJSONFile(clientsFile, filteredClients);
    res.json({ message: 'Client deleted' });
});

// Rotas para vendas
app.get('/api/sales', async (req, res) => {
    try {
        const sales = await readJSONFile(salesFile);
        res.json(sales);
    } catch (error) {
        console.error('Erro ao buscar vendas:', error);
        res.status(500).json({ error: 'Erro ao buscar vendas' });
    }
});

app.post('/api/sales', async (req, res) => {
    try {
        const sales = await readJSONFile(salesFile);
        const newSale = req.body;
        newSale.valorTotal = parseFloat(newSale.valorTotal); // Converte o valor total para número

        if (isNaN(newSale.valorTotal)) {
            return res.status(400).json({ error: 'Valor total inválido' });
        }

        newSale.id = Date.now().toString();
        sales.push(newSale);
        await writeJSONFile(salesFile, sales);
        res.json(newSale);
    } catch (error) {
        console.error('Erro ao salvar a venda:', error);
        res.status(500).json({ error: 'Erro ao salvar a venda' });
    }
});

app.put('/api/sales/:id', async (req, res) => {
    try {
        const sales = await readJSONFile(salesFile);
        const saleId = req.params.id;
        const updatedSale = req.body;
        
        const index = sales.findIndex(sale => sale.id === saleId);
        if (index !== -1) {
            // Manter o número da venda original
            updatedSale.numero = sales[index].numero;
            sales[index] = { ...sales[index], ...updatedSale };
            await writeJSONFile(salesFile, sales);
            res.json(sales[index]);
        } else {
            res.status(404).json({ error: 'Venda não encontrada' });
        }
    } catch (error) {
        console.error('Erro ao atualizar a venda:', error);
        res.status(500).json({ error: 'Erro ao atualizar a venda' });
    }
});

app.delete('/api/sales/:id', async (req, res) => {
    const sales = await readJSONFile(salesFile);
    const updatedSales = sales.filter(sale => sale.id !== req.params.id);
    await writeJSONFile(salesFile, updatedSales);
    res.status(204).send();
});

// Rota para obter um produto específico
app.get('/api/products/:id', async (req, res) => {
    const products = await readJSONFile(productsFile);
    const product = products.find(p => p.id === req.params.id);
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ error: 'Product not found' });
    }
});

// Rota para obter um cliente específico
app.get('/api/clients/:id', async (req, res) => {
    const clients = await readJSONFile(clientsFile);
    const client = clients.find(c => c.id === req.params.id);
    if (client) {
        res.json(client);
    } else {
        res.status(404).json({ error: 'Client not found' });
    }
});

// Rota para obter uma venda específica
app.get('/api/sales/:id', async (req, res) => {
    try {
        const sales = await readJSONFile(salesFile);
        const sale = sales.find(s => s.id === req.params.id);
        if (sale) {
            // Buscar informações detalhadas do cliente
            const clients = await readJSONFile(clientsFile);
            const clientInfo = clients.find(c => c.nome.trim().toLowerCase() === sale.cliente.trim().toLowerCase());
            if (clientInfo) {
                sale.clienteInfo = clientInfo;
            }
            res.json(sale);
        } else {
            res.status(404).json({ error: 'Venda não encontrada' });
        }
    } catch (error) {
        console.error('Erro ao buscar venda:', error);
        res.status(500).json({ error: 'Erro ao buscar a venda' });
    }
});

app.get('/api/cnpj/:cnpj', async (req, res) => {
    const cnpj = req.params.cnpj;
    try {
        const response = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`);
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar dados do CNPJ:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do CNPJ' });
    }
});

// Rota para obter o próximo número de venda
app.get('/api/next-sale-number', async (req, res) => {
    try {
        const sales = await readJSONFile(salesFile);
        const nextNumber = sales.length > 0 ? Math.max(...sales.map(s => parseInt(s.numero))) + 1 : 1;
        res.json({ nextNumber: nextNumber.toString() });
    } catch (error) {
        console.error('Erro ao obter o próximo número de venda:', error);
        res.status(500).json({ error: 'Erro ao obter o próximo número de venda' });
    }
});

// Rota de registro
app.post('/api/register', authenticateToken, isAdmin, async (req, res) => {
    const { username, password, isAdmin, permissions } = req.body;

    try {
        const users = await readJSONFile(usersFile);
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now().toString(),
            username,
            password: hashedPassword,
            isAdmin,
            permissions
        };

        users.push(newUser);
        await writeJSONFile(usersFile, users);

        res.status(201).json({ message: 'Usuário criado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// Rota de login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const users = await readJSONFile(usersFile);
        const user = users.find(u => u.username === username);

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign(
                { 
                    id: user.id, 
                    username: user.username, 
                    isAdmin: user.isAdmin,
                    permissions: user.permissions 
                }, 
                SECRET_KEY, 
                { expiresIn: '100y' }
            );

            res.json({ 
                success: true, 
                message: 'Autenticação bem-sucedida', 
                token: token,
                redirectTo: '/sales-management.html'
            });
        } else {
            res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }
    } catch (error) {
        console.error('Erro durante o login:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

async function getPublicIP(req) {
    // Tenta obter o IP do cabeçalho X-Forwarded-For primeiro
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    // Se não houver X-Forwarded-For, usa o IP remoto
    const remoteIP = req.connection.remoteAddress;
    if (remoteIP && remoteIP !== '::1' && remoteIP !== '127.0.0.1') {
        return remoteIP;
    }

    // Se ainda não tiver um IP válido, usa um serviço externo
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        return response.data.ip;
    } catch (error) {
        console.error('Erro ao obter IP público:', error);
        return 'IP não disponível';
    }
}

async function sendLogToDiscord(username, ip) {
    const webhookUrl = 'https://discord.com/api/webhooks/1290425536727748660/W_Hzzz1ffmHanIa9NvcmXZR1ZDpkWwRS9q1gaE20zMMMcxOVwPklSWyoUffN9M1tl-94';
    const currentTime = moment().tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm:ss');
    
    const message = {
        embeds: [{
            title: "Novo Login Detectado",
            color: 3447003,  // Cor azul
            fields: [
                { name: "Usuário", value: username, inline: true },
                { name: "IP", value: ip, inline: true },
                { name: "Horário", value: `${currentTime} (Brasília)`, inline: false }
            ],
            footer: { text: "Sistema de Logs - Portugal Madeiras" }
        }]
    };

    try {
        await axios.post(webhookUrl, message);
        console.log('Log enviado para o Discord com sucesso.');
    } catch (error) {
        console.error('Erro ao enviar log para o Discord:', error);
    }
}

// Middleware de autenticação
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = {
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            permissions: user.permissions || [] // Garante que sempre haverá um array de permissões
        };
        next();
    });
}

// Middleware para verificar se o usuário é admin
function isAdmin(req, res, next) {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
    }
}

// Exemplo de rota protegida
app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Acesso autorizado', user: req.user });
});

// Rotas para cheques
app.get('/api/cheques', async (req, res) => {
    const cheques = await readJSONFile(chequesFile);
    res.json(cheques);
});

app.post('/api/cheques', async (req, res) => {
    try {
        const cheques = await readJSONFile(chequesFile);
        const newCheque = {
            ...req.body,
            dataCompensacao: formatarDataParaISO(req.body.dataCompensacao)
        };
        newCheque.id = Date.now().toString();
        
        // Ajustar as datas para o formato ISO
        if (newCheque.dataEmissao) {
            newCheque.dataEmissao = new Date(newCheque.dataEmissao).toISOString().split('T')[0];
        }
        if (newCheque.dataCompensacao) {
            newCheque.dataCompensacao = new Date(newCheque.dataCompensacao).toISOString().split('T')[0];
        }

        cheques.push(newCheque);
        await writeJSONFile(chequesFile, cheques);
        res.json(newCheque);
    } catch (error) {
        console.error('Erro ao salvar o cheque:', error);
        res.status(500).json({ error: 'Erro ao salvar o cheque' });
    }
});

app.post('/api/cheques/:id/deposit', async (req, res) => {
    const { id } = req.params;
    const { compensado } = req.body;
    try {
        let cheques = await readJSONFile(chequesFile);
        let cheque = cheques.find(c => c.id === id);

        if (!cheque) {
            return res.status(404).json({ success: false, message: 'Cheque não encontrado' });
        }

        cheque.compensado = compensado;
        if (compensado) {
            // Armazenar a data e hora atual quando o cheque é compensado
            cheque.dataHoraCompensacao = new Date().toISOString();
        } else {
            // Remover a data de compensação se o cheque não está mais compensado
            delete cheque.dataHoraCompensacao;
        }
        await writeJSONFile(chequesFile, cheques);
        res.json({ success: true, cheque });
    } catch (error) {
        console.error('Erro ao atualizar o estado do cheque:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para excluir um cheque
app.delete('/api/cheques/:id', async (req, res) => {
    console.log('Requisição de exclusão recebida para o cheque ID:', req.params.id);
    try {
        const cheques = await readJSONFile(chequesFile);
        console.log('Cheques antes da exclusão:', cheques.length);
        const chequeId = req.params.id;
        const updatedCheques = cheques.filter(cheque => cheque.id !== chequeId);

        if (cheques.length === updatedCheques.length) {
            return res.status(404).json({ error: 'Cheque não encontrado' });
        }

        await writeJSONFile(chequesFile, updatedCheques);
        console.log('Cheques após a exclusão:', updatedCheques.length);
        res.json({ message: 'Cheque excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir cheque:', error);
        res.status(500).json({ error: 'Erro ao excluir o cheque' });
    }
});

app.get('/api/cheques/:id', async (req, res) => {
    try {
        const cheques = await readJSONFile(chequesFile);
        let cheque = cheques.find(c => c.id === req.params.id);
        if (cheque) {
            // Garante que todos os campos necessários estejam presentes
            cheque = {
                id: cheque.id,
                numeroCheque: cheque.numeroCheque || '',
                banco: cheque.banco || '',
                valor: cheque.valor || 0,
                remetente: cheque.remetente || '', // Alterado de 'beneficiario' para 'remetente'
                dataCompensacao: cheque.dataCompensacao || '',
                compensado: !!cheque.compensado // Converte para booleano
            };
            res.json(cheque);
        } else {
            res.status(404).json({ error: 'Cheque não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar cheque:', error);
        res.status(500).json({ error: 'Erro ao buscar o cheque' });
    }
});

app.put('/api/cheques/:id', async (req, res) => {
    try {
        const cheques = await readJSONFile(chequesFile);
        const index = cheques.findIndex(c => c.id === req.params.id);
        if (index !== -1) {
            // Garantir que estamos usando 'remetente' em vez de 'beneficiario'
            const updatedCheque = { ...cheques[index], ...req.body };
            if (updatedCheque.beneficiario) {
                updatedCheque.remetente = updatedCheque.beneficiario;
                delete updatedCheque.beneficiario;
            }
            cheques[index] = updatedCheque;
            await writeJSONFile(chequesFile, cheques);
            res.json({ success: true, cheque: cheques[index] });
        } else {
            res.status(404).json({ error: 'Cheque não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao atualizar cheque:', error);
        res.status(500).json({ error: 'Erro ao atualizar o cheque' });
    }
});

function formatarDataParaISO(data) {
    if (!data) return '';
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}`;
}

// Agendar backup diário às 00:00
schedule.scheduleJob('0 0 * * *', performBackup);

// Proteger as rotas de backup
app.post('/api/backup', authenticateToken, async (req, res) => {
    try {
        const result = await performBackup();
        if (result.success) {
            const config = await readConfig();
            config.lastBackupDate = formatDate(new Date());
            await fs.writeFile(path.join(__dirname, 'data', 'config.json'), JSON.stringify(config, null, 2));
            res.json({ message: result.message, lastBackupDate: config.lastBackupDate });
        } else {
            res.status(500).json({ error: result.message });
        }
    } catch (error) {
        console.error('Erro ao realizar backup:', error);
        res.status(500).json({ error: 'Erro ao realizar backup' });
    }
});

app.get('/api/backups', authenticateToken, async (req, res) => {
    try {
        const files = await fs.readdir(backupDir);
        res.json(files);
    } catch (error) {
        console.error('Erro ao listar backups:', error);
        res.status(500).json({ error: 'Erro ao listar backups' });
    }
});

// Rota para servir o arquivo de backup (também protegida)
app.get('/backups/:filename', authenticateToken, (req, res) => {
    const filePath = path.join(backupDir, req.params.filename);
    res.download(filePath, (err) => {
        if (err) {
            res.status(404).send('Arquivo não encontrado');
        }
    });
});

const backupDir = path.join(__dirname, 'public', 'backups');

// Função para verificar e criar o diretório de backups
async function ensureBackupDir() {
    try {
        await fs.access(backupDir);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(backupDir, { recursive: true });
        } else {
            throw error;
        }
    }
}

// Chame esta função no início do seu servidor
ensureBackupDir().catch(console.error);

// Rota para marcar uma venda como paga ou não paga
app.post('/api/sales/:id/pay', async (req, res) => {
    try {
        const saleId = req.params.id;
        const { paga } = req.body;
        console.log(`Tentando atualizar venda ${saleId} para paga=${paga}`);

        const sales = await readJSONFile(salesFile);
        console.log(`Número de vendas lidas: ${sales.length}`);

        const saleIndex = sales.findIndex(sale => sale.id === saleId);
        console.log(`Índice da venda encontrada: ${saleIndex}`);

        if (saleIndex === -1) {
            console.log(`Venda ${saleId} não encontrada`);
            return res.status(404).json({ success: false, message: 'Venda não encontrada' });
        }

        sales[saleIndex].paga = paga;
        console.log(`Status de pagamento atualizado para ${paga}`);

        await writeJSONFile(salesFile, sales);
        console.log('Arquivo de vendas atualizado com sucesso');

        res.json({ success: true, sale: sales[saleIndex] });
    } catch (error) {
        console.error('Erro ao atualizar o status de pagamento da venda:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Adicione esta rota ao seu arquivo server.js
app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await readJSONFile(usersFile);
        // Remova as senhas antes de enviar os dados
        const safeUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin // Incluímos esta informação para o frontend
        }));
        res.json(safeUsers);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
    const { username, password, isAdmin, permissions } = req.body;
    const userId = req.params.id;

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
        return res.status(400).json({ error: 'O nome de usuário deve conter apenas caracteres alfanuméricos.' });
    }

    try {
        const users = await readJSONFile(usersFile);
        const userIndex = users.findIndex(user => user.id === userId);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        users[userIndex].username = username;
        users[userIndex].isAdmin = isAdmin;
        users[userIndex].permissions = permissions;

        if (password) {
            if (password.length < 5) {
                return res.status(400).json({ error: 'A senha deve ter no mínimo 5 caracteres.' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            users[userIndex].password = hashedPassword;
        }

        await writeJSONFile(usersFile, users);
        res.json({ message: 'Usuário atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
    const userId = req.params.id;
    try {
        const users = await readJSONFile(usersFile);
        const user = users.find(u => u.id === userId);
        if (user) {
            const { password, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        } else {
            res.status(404).json({ error: 'Usuário não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

const usersFile = path.join(__dirname, 'data', 'users.json');

async function readUsers() {
    try {
        const data = await fs.readFile(usersFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro ao ler o arquivo de usuários:', error);
        return [];
    }
}

// Adicione esta rota após as outras rotas de usuário
app.delete('/api/users/:id', authenticateToken, isAdmin, async (req, res) => {
    const userId = req.params.id;
    try {
        const users = await readJSONFile(usersFile);
        const updatedUsers = users.filter(user => user.id !== userId);
        
        if (users.length === updatedUsers.length) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        await writeJSONFile(usersFile, updatedUsers);
        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Adicione uma nova rota para verificar permissões
app.get('/api/check-permission', authenticateToken, (req, res) => {
    const { permission } = req.query;
    if (req.user.isAdmin || (req.user.permissions && (req.user.permissions.includes(permission) || req.user.permissions.includes('all')))) {
        res.json({ hasPermission: true });
    } else {
        res.json({ hasPermission: false });
    }
});

async function ensureUserPermissions() {
    const users = await readJSONFile(usersFile);
    let updated = false;
    users.forEach(user => {
        if (!user.permissions) {
            user.permissions = [];
            updated = true;
        }
    });
    if (updated) {
        await writeJSONFile(usersFile, users);
    }
}

// Chame esta função quando o servidor iniciar
ensureUserPermissions().catch(console.error);

// Adicione esta nova rota
app.post('/api/backup-config', authenticateToken, async (req, res) => {
    try {
        const { frequency } = req.body;
        const config = await readConfig();
        config.backupFrequency = frequency;
        await fs.writeFile(path.join(__dirname, 'data', 'config.json'), JSON.stringify(config, null, 2));
        res.json({ message: 'Configuração de backup salva com sucesso' });
    } catch (error) {
        console.error('Erro ao salvar configuração de backup:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Adicione também uma rota para obter a configuração atual
app.get('/api/backup-config', authenticateToken, async (req, res) => {
    try {
        const config = await readConfig();
        res.json({ 
            frequency: config.backupFrequency || 'daily',
            lastBackupDate: config.lastBackupDate || 'Nenhum backup realizado'
        });
    } catch (error) {
        console.error('Erro ao obter configuração de backup:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/restore-backup', authenticateToken, upload.single('backupFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
    }

    try {
        const zip = new AdmZip(req.file.path);
        const zipEntries = zip.getEntries();

        for (const entry of zipEntries) {
            if (!entry.isDirectory) {
                const fileName = path.basename(entry.entryName);
                const filePath = path.join(__dirname, 'data', fileName);
                zip.extractEntryTo(entry, path.dirname(filePath), false, true);
            }
        }

        // Limpar o arquivo temporário
        await fs.unlink(req.file.path);

        res.json({ message: 'Backup restaurado com sucesso.' });
    } catch (error) {
        console.error('Erro ao restaurar backup:', error);
        res.status(500).json({ error: 'Erro ao restaurar backup.' });
    }
});

// Adicione esta nova rota
app.get('/api/cep/:cep', async (req, res) => {
    const cep = req.params.cep;
    try {
        const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao buscar dados do CEP:', error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({ error: 'Erro ao buscar dados do CEP' });
    }
});

// Endpoint para buscar cidades
app.get('/api/cidades', async (req, res) => {
    const { termo } = req.query;
    console.log("Termo recebido:", termo); // Adicione este log
    try {
        const response = await axios.get(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios`);
        const cidades = response.data
            .filter(cidade => cidade.nome.toLowerCase().includes(termo.toLowerCase()))
            .map(cidade => ({
                nome: cidade.nome,
                uf: cidade.microrregiao.mesorregiao.UF.sigla
            }));
        console.log("Cidades encontradas:", cidades.length); // Adicione este log
        res.json(cidades);
    } catch (error) {
        console.error('Erro ao buscar cidades:', error);
        res.status(500).json({ error: 'Erro ao buscar cidades' });
    }
});

// {{ edit_1: Adicionar rotas para Orçamentos }}
const budgetsRouter = express.Router();
const budgetsFile = path.join(__dirname, 'data', 'budgets.json');

// Função para garantir que o arquivo de orçamentos exista
async function ensureBudgetsFile() {
    try {
        await fs.access(budgetsFile);
    } catch (error) {
        // Se o arquivo não existir, criar com um array vazio
        await writeJSONFile(budgetsFile, []);
    }
}
ensureBudgetsFile();

// GET /api/budgets - Obter todos os orçamentos
budgetsRouter.get('/', async (req, res) => {
    try {
        const budgets = await readJSONFile(budgetsFile);
        res.json(budgets);
    } catch (error) {
        console.error('Erro ao buscar os orçamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar os orçamentos' });
    }
});

// GET /api/budgets/:id - Obter um orçamento específico por ID
budgetsRouter.get('/:id', async (req, res) => {
    try {
        const budgets = await readJSONFile(budgetsFile);
        const budget = budgets.find(b => b.id === req.params.id);
        if (budget) {
            res.json(budget);
        } else {
            res.status(404).json({ error: 'Orçamento não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar o orçamento:', error);
        res.status(500).json({ error: 'Erro ao buscar o orçamento' });
    }
});

// POST /api/budgets - Criar um novo orçamento
budgetsRouter.post('/', async (req, res) => {
    try {
        const budgets = await readJSONFile(budgetsFile);
        const newBudget = {
            id: Date.now().toString(),
            ...req.body,
            paga: false // Definir como não paga por padrão
        };
        budgets.push(newBudget);
        await writeJSONFile(budgetsFile, budgets);
        res.status(201).json(newBudget);
    } catch (error) {
        console.error('Erro ao criar o orçamento:', error);
        res.status(500).json({ error: 'Erro ao criar o orçamento' });
    }
});

// PUT /api/budgets/:id - Atualizar um orçamento existente
budgetsRouter.put('/:id', async (req, res) => {
    try {
        const budgets = await readJSONFile(budgetsFile);
        const index = budgets.findIndex(b => b.id === req.params.id);
        if (index !== -1) {
            budgets[index] = { ...budgets[index], ...req.body };
            await writeJSONFile(budgetsFile, budgets);
            res.json(budgets[index]);
        } else {
            res.status(404).json({ error: 'Orçamento não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao atualizar o orçamento:', error);
        res.status(500).json({ error: 'Erro ao atualizar o orçamento' });
    }
});

// DELETE /api/budgets/:id - Excluir um orçamento
budgetsRouter.delete('/:id', async (req, res) => {
    try {
        const budgets = await readJSONFile(budgetsFile);
        const index = budgets.findIndex(b => b.id === req.params.id);
        if (index !== -1) {
            const deletedBudget = budgets.splice(index, 1);
            await writeJSONFile(budgetsFile, budgets);
            res.json(deletedBudget[0]);
        } else {
            res.status(404).json({ error: 'Orçamento não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao excluir o orçamento:', error);
        res.status(500).json({ error: 'Erro ao excluir o orçamento' });
    }
});

// POST /api/budgets/:id/pay - Marcar/Desmarcar um orçamento como pago
budgetsRouter.post('/:id/pay', async (req, res) => {
    try {
        const budgets = await readJSONFile(budgetsFile);
        const budget = budgets.find(b => b.id === req.params.id);
        if (budget) {
            budget.paga = req.body.paga;
            await writeJSONFile(budgetsFile, budgets);
            res.json({ success: true, budget });
        } else {
            res.status(404).json({ error: 'Orçamento não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao marcar o orçamento como pago:', error);
        res.status(500).json({ error: 'Erro ao atualizar o orçamento' });
    }
});

// Associar as rotas de orçamentos ao caminho /api/budgets
app.use('/api/budgets', budgetsRouter);
// {{ edit_1 ends }}