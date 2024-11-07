const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const boletosFilePath = path.join(__dirname, 'data', 'boletos.json');
const PORT = 3000;
const axios = require('axios');
const crypto = require('crypto');
const schedule = require('node-schedule');
const { performBackup } = require('./backup');
const multer = require('multer');
const AdmZip = require('adm-zip');
const moment = require('moment-timezone');
const BOLETOS_FILE = path.join(__dirname, 'data', 'boletos.json');
const SALES_FILE = path.join(__dirname, 'data', 'sales.json');
const mongoose = require('mongoose');
const whatsappRoutes = require('./routes/whatsapp');

const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(express.json({limit: '50mb'}));
app.use(express.static('public'));

const productsFile = path.join(__dirname, 'data', 'products.json');
const clientsFile = path.join(__dirname, 'data', 'clients.json');
const salesFile = path.join(__dirname, 'data', 'sales.json');
const chequesFile = path.join(__dirname, 'data', 'cheques.json');
require('dotenv').config();
const SECRET_KEY = process.env.SECRET_KEY;

// Crie a pasta 'temp' se ela não existir
const tempDir = path.join(__dirname, 'temp');
fs.mkdir(tempDir, { recursive: true }).catch(console.error);

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

// Defina o esquema e o modelo Sale
const saleSchema = new mongoose.Schema({
    // Defina os campos do seu modelo de venda aqui
    // Por exemplo:
    numero: String,
    cliente: String,
    valorTotal: Number,
    status: String,
    // ... outros campos
});

const Sale = mongoose.model('Sale', saleSchema);

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

        // Obter o último número de venda
        let lastNumber = 0;
        if (sales.length > 0) {
            lastNumber = Math.max(...sales.map(sale => parseInt(sale.numero)));
        }

        // Incrementar o número para a nova venda
        newSale.numero = (lastNumber + 1).toString();

        // Adicionar id e paga à nova venda
        newSale.id = Date.now().toString();
        newSale.paga = newSale.paga || false;

        sales.push(newSale);
        await writeJSONFile(salesFile, sales);

        res.status(201).json(newSale);
    } catch (error) {
        console.error('Erro ao criar venda:', error);
        res.status(500).json({ error: 'Erro ao criar venda' });
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
        console.error('Erro ao buscar dados do CNPJ:', error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({ error: 'Erro ao buscar dados do CNPJ' });
    }
});

// Rota para obter o próximo número de venda
app.get('/api/sales/last-number', async (req, res) => {
    try {
        const sales = await readJSONFile(salesFile);
        let lastNumber = 0;

        if (sales.length > 0) {
            lastNumber = Math.max(...sales.map(sale => parseInt(sale.numero)));
        }

        res.json({ lastNumber });
    } catch (error) {
        console.error('Erro ao obter o último número de venda:', error);
        res.status(500).json({ error: 'Erro ao obter o último número de venda' });
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

app.post('/api/products/update', async (req, res) => {
    try {
        const { id, field, value } = req.body;
        const productsPath = path.join(__dirname, 'data', 'products.json');
        
        let products = JSON.parse(await fs.readFile(productsPath, 'utf8'));
        
        const productIndex = products.findIndex(p => p.id === id);
        if (productIndex !== -1) {
            if (field === 'valor' || field === 'valorEspecial') {
                products[productIndex][field] = parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.'));
            } else {
                products[productIndex][field] = value;
            }
            
            await fs.writeFile(productsPath, JSON.stringify(products, null, 2));
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
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

async function testDiscordWebhook() {
    const webhookUrl = 'https://discord.com/api/webhooks/1294771376447684615/hc4HetIIxayquuoJOEm8m9JVY9ith2n9n4oQCdmYG47Ryx426-esCuOlX_JV1w9GXWtg';
    const testMessage = { content: 'Teste de conexão com a webhook do Discord' };

    try {
        console.log('Enviando mensagem de teste para o Discord...');
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testMessage),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();
        console.log('Teste enviado com sucesso:', response.status, responseText);
    } catch (error) {
        console.error('Erro no teste da webhook:', error.message);
    }
}

// Chame a função de teste ao iniciar o servidor
testDiscordWebhook();

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function sendLogToDiscord(ip, path) {
    const webhookUrl = 'https://discord.com/api/webhooks/1294771376447684615/hc4HetIIxayquuoJOEm8m9JVY9ith2n9n4oQCdmYG47Ryx426-esCuOlX_JV1w9GXWtg';
    const currentTime = moment().tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm:ss');
    
    const message = {
        embeds: [{
            title: "Novo Acesso ao Site",
            color: 3447003,
            fields: [
                { name: "IP", value: ip, inline: true },
                { name: "Página Acessada", value: path, inline: true },
                { name: "Horário", value: `${currentTime} (Brasília)`, inline: false }
            ],
            footer: { text: "Sistema de Logs - Portugal Madeiras" }
        }]
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('Log enviado para o Discord com sucesso.');
    } catch (error) {
        console.error('Erro ao enviar log para o Discord:', error.message);
    }
}

async function testDiscordWebhook() {
    const webhookUrl = 'https://discord.com/api/webhooks/1294771376447684615/hc4HetIIxayquuoJOEm8m9JVY9ith2n9n4oQCdmYG47Ryx426-esCuOlX_JV1w9GXWtg';
    const testMessage = { content: 'Teste de conexão com a webhook do Discord' };

    try {
        console.log('Enviando mensagem de teste para o Discord...');
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testMessage),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();
        console.log('Teste enviado com sucesso:', response.status, responseText);
    } catch (error) {
        console.error('Erro no teste da webhook:', error.message);
    }
}

// Chame a função de teste ao iniciar o servidor
testDiscordWebhook();

// Middleware para registrar acessos
app.use(async (req, res, next) => {
    if (req.path !== '/favicon.ico') {  // Ignora requisições de favicon
        try {
            const ip = await getPublicIP(req);
            console.log(`Acesso detectado - IP: ${ip}, Página: ${req.path}`);
            await sendLogToDiscord(ip, req.path);
        } catch (error) {
            console.error('Erro ao registrar acesso:', error);
        }
    }
    next();
});

async function getPublicIP(req) {
    // Lista de cabeçalhos para verificar, em ordem de prioridade
    const ipHeaders = [
        'x-client-ip',
        'x-forwarded-for',
        'cf-connecting-ip',    // Cloudflare
        'fastly-client-ip',    // Fastly CDN
        'x-real-ip',           // Nginx proxy/FastCGI
        'x-cluster-client-ip', // Rackspace LB, Riverbed Stingray
        'x-forwarded',
        'forwarded-for',
        'forwarded'
    ];

    let clientIP;

    // Verifica os cabeçalhos
    for (const header of ipHeaders) {
        clientIP = req.headers[header];
        if (clientIP) {
            // Se for uma lista de IPs, pega o primeiro
            const ipList = clientIP.split(',');
            clientIP = ipList[0].trim();
            break;
        }
    }

    // Se não encontrou nos cabeçalhos, usa o remoteAddress
    if (!clientIP) {
        clientIP = req.connection.remoteAddress || 
                   req.socket.remoteAddress || 
                   req.connection.socket.remoteAddress;
    }

    // Remove IPv6 prefix se presente
    clientIP = clientIP.replace(/^::ffff:/, '');

    // Verifica se é um IPv4 válido
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(clientIP)) {
        // Se não for um IPv4 válido, usa um serviço externo como fallback
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            clientIP = data.ip;
        } catch (error) {
            console.error('Erro ao obter IP do serviço externo:', error);
            clientIP = 'IP não disponível';
        }
    }

    return clientIP;
}

async function sendLogToDiscord(ip, path) {
    const webhookUrl = 'https://discord.com/api/webhooks/1294771376447684615/hc4HetIIxayquuoJOEm8m9JVY9ith2n9n4oQCdmYG47Ryx426-esCuOlX_JV1w9GXWtg';
    const currentTime = moment().tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm:ss');
    
    const message = {
        embeds: [{
            title: "Novo Acesso ao Site",
            color: 3447003,
            fields: [
                { name: "IP", value: ip, inline: true },
                { name: "Página Acessada", value: path, inline: true },
                { name: "Horário", value: `${currentTime} (Brasília)`, inline: false }
            ],
            footer: { text: "Sistema de Logs - Portugal Madeiras" }
        }]
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        console.log('Log enviado para o Discord com sucesso.');
    } catch (error) {
        console.error('Erro ao enviar log para o Discord:', error.message);
    }
}

function markParcelAsPaid(saleId, parcelIndex) {
    fetch(`/api/sales/${saleId}/parcelas/${parcelIndex}/pay`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Falha ao marcar como paga');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('Parcela marcada como paga com sucesso');
            // Atualizar a interface aqui, se necessário
        } else {
            throw new Error(data.message);
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('Ocorreu um erro ao marcar a parcela como paga. Por favor, tente novamente.');
    });
}

// Middleware de autenticação
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
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
schedule.scheduleJob('0 21 * * *', performBackup);

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

// Função para ler o último número de boleto
async function lerUltimoNumeroBoleto() {
    try {
        const response = await fetch('/api/boletos');
        const data = await response.json();
        return data.ultimoNumeroBoleto;
    } catch (error) {
        console.error('Erro ao ler o último número de boleto:', error);
        return 199; // Valor padrão caso ocorra um erro
    }
}

// Função para atualizar o último número de boleto
async function atualizarUltimoNumeroBoleto(numero) {
    try {
        await fetch('/api/boletos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ultimoNumeroBoleto: numero }),
        });
    } catch (error) {
        console.error('Erro ao atualizar o último número de boleto:', error);
    }
}

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
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        const users = JSON.parse(await fs.readFile('data/users.json', 'utf8'));
        const sanitizedUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            permissions: user.permissions || []
        }));
        res.json(sanitizedUsers);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
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

app.get('/api/boletos', async (req, res) => {
    try {
        const data = await fs.readFile(boletosFilePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Erro ao ler o arquivo boletos.json:', error);
        res.status(500).json({ error: 'Erro ao ler o número do boleto' });
    }
});

app.post('/api/boletos', async (req, res) => {
    try {
        const { ultimoNumeroBoleto } = req.body;
        await fs.writeFile(boletosFilePath, JSON.stringify({ ultimoNumeroBoleto }, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao escrever no arquivo boletos.json:', error);
        res.status(500).json({ error: 'Erro ao atualizar o número do boleto' });
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
            // Buscar informações detalhadas do cliente
            const clients = await readJSONFile(clientsFile);
            const clientInfo = clients.find(c => c.nome.trim().toLowerCase() === budget.cliente.trim().toLowerCase());
            if (clientInfo) {
                budget.clienteInfo = clientInfo;
            }
            res.json(budget);
        } else {
            res.status(404).json({ error: 'Orçamento não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar orçamento:', error);
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

// Adicione esta nova rota após as rotas existentes de orçamentos

// Rota para obter o próximo número de orçamento
app.get('/api/next-budget-number', async (req, res) => {
    try {
        const budgets = await readJSONFile(budgetsFile);
        const nextNumber = budgets.length > 0 ? Math.max(...budgets.map(b => parseInt(b.numero))) + 1 : 1;
        res.json({ nextNumber: nextNumber.toString() });
    } catch (error) {
        console.error('Erro ao obter o próximo número de orçamento:', error);
        res.status(500).json({ error: 'Erro ao obter o próximo número de orçamento' });
    }
});

// Adicione esta nova rota para o dashboard
app.get('/api/dashboard-data', authenticateToken, async (req, res) => {
    try {
        // Ler vendas do arquivo JSON
        const vendas = await readJSONFile(salesFile);

        // Calcular total de vendas
        const totalVendas = vendas.length;

        // Calcular faturamento total
        const faturamentoTotal = vendas.reduce((total, venda) => total + (venda.valorFinal || 0), 0);

        // Formatar o faturamento total
        const faturamentoTotalFormatado = faturamentoTotal.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        // Calcular vendas pendentes
        const vendasPendentes = vendas.filter(venda => venda.situacao === "Concretizada" && !venda.paga).length;

        // Calcular produtos mais vendidos
        const produtosPorQuantidade = vendas.flatMap(venda => venda.produtos || [])
            .reduce((acc, produto) => {
                if (produto && produto.produto) {
                    acc[produto.produto] = (acc[produto.produto] || 0) + (produto.quantidade || 1);
                }
                return acc;
            }, {});

        const produtosMaisVendidos = Object.entries(produtosPorQuantidade)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([produto, quantidade]) => ({ nome: produto, quantidade }));

        // Se não houver produtos, adicione uma mensagem
        if (produtosMaisVendidos.length === 0) {
            produtosMaisVendidos.push({ nome: "Nenhum produto identificado nas vendas", quantidade: 0 });
        }

        // Calcular clientes mais ativos
        const clientesPorCompras = vendas.reduce((acc, venda) => {
            acc[venda.cliente] = (acc[venda.cliente] || 0) + 1;
            return acc;
        }, {});

        const clientesMaisAtivos = Object.entries(clientesPorCompras)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([nome, compras]) => ({ nome, compras }));

        // Calcular vendas por mês
        const vendasPorMes = vendas.reduce((acc, venda) => {
            // Use moment para ajustar a data para o fuso horário de Brasília
            const data = moment(venda.data).tz('America/Sao_Paulo');
            const mesAno = `${data.format('MM')}/${data.format('YYYY')}`;
            acc[mesAno] = (acc[mesAno] || 0) + 1;
            return acc;
        }, {});

        const vendasPorMesData = {
            labels: Object.keys(vendasPorMes),
            valores: Object.values(vendasPorMes)
        };

        // Calcular distribuição de produtos
        const distribuicaoProdutos = produtosMaisVendidos.reduce((acc, produto) => {
            acc.labels.push(produto.nome);
            acc.valores.push(produto.quantidade);
            return acc;
        }, { labels: [], valores: [] });

        // Calcular total de clientes únicos
        const totalClientes = new Set(vendas.map(venda => venda.cliente)).size;

        res.json({
            totalVendas,
            faturamentoTotal: faturamentoTotalFormatado,
            vendasPendentes,
            produtosMaisVendidos,
            clientesMaisAtivos,
            vendasPorMes: vendasPorMesData,
            distribuicaoProdutos,
            totalClientes
        });
    } catch (error) {
        console.error('Erro ao obter dados do dashboard:', error);
        res.status(500).json({ message: 'Erro ao obter dados do dashboard' });
    }
});

// {{ edit_1 ends }}

// Adicione esta nova rota no seu arquivo server.js
app.post('/api/generate-sale/:id', authenticateToken, async (req, res) => {
    const budgetId = req.params.id;

    try {
        // Buscar o orçamento
        const budgets = await readJSONFile(budgetsFile);
        const budgetIndex = budgets.findIndex(b => b.id === budgetId);

        if (budgetIndex === -1) {
            return res.status(404).json({ success: false, message: 'Orçamento não encontrado' });
        }

        const budget = budgets[budgetIndex];

        // Criar uma nova venda baseada no orçamento
        const newSale = {
            id: Date.now().toString(),
            numero: await generateNextSaleNumber(),
            data: new Date().toISOString().split('T')[0], // Data atual no formato YYYY-MM-DD
            cliente: budget.cliente,
            produtos: budget.produtos,
            valorTotal: budget.valorTotal,
            descontoTotal: budget.descontoTotal,
            valorFinal: budget.valorFinal,
            tipoPagamento: budget.tipoPagamento,
            formaPagamento: budget.formaPagamento,
            parcelas: budget.parcelas,
            situacao: 'Concretizada',
            paga: false
        };

        // Salvar a nova venda
        const sales = await readJSONFile(salesFile);
        sales.push(newSale);
        await writeJSONFile(salesFile, sales);

        // Atualizar o status do orçamento para "Aprovado"
        budgets[budgetIndex].situacao = 'Aprovado';
        await writeJSONFile(budgetsFile, budgets);

        res.json({ success: true, message: 'Venda gerada com sucesso', sale: newSale });
    } catch (error) {
        console.error('Erro ao gerar venda:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar venda' });
    }
});

// Função auxiliar para gerar o próximo número de venda
async function generateNextSaleNumber() {
    const sales = await readJSONFile(salesFile);
    const lastSale = sales.reduce((max, sale) => parseInt(sale.numero) > max ? parseInt(sale.numero) : max, 0);
    return (lastSale + 1).toString();
}

app.post('/api/mark-parcel-as-paid', async (req, res) => {
    try {
        const { saleId, parcelIndex } = req.body;
        
        const data = await fs.readFile(SALES_FILE, 'utf8');
        let sales = JSON.parse(data);

        const saleIndex = sales.findIndex(s => s.id === saleId);
        if (saleIndex === -1) {
            return res.status(404).json({ success: false, message: 'Venda não encontrada' });
        }

        const sale = sales[saleIndex];

        if (sale.tipoPagamento === "À Vista") {
            // Para vendas à vista, marcar a venda inteira como paga
            sale.paga = true;
        } else {
            // Para vendas parceladas
            if (!sale.parcelas || !sale.parcelas[parcelIndex]) {
                return res.status(404).json({ success: false, message: 'Parcela não encontrada' });
            }

            sale.parcelas[parcelIndex].paga = true;

            // Verificar se todas as parcelas estão pagas
            const allPaid = sale.parcelas.every(p => p.paga);
            if (allPaid) {
                sale.paga = true;
            }
        }

        // Salvar as alterações no arquivo
        await fs.writeFile(SALES_FILE, JSON.stringify(sales, null, 2));

        res.json({ 
            success: true, 
            message: 'Venda/parcela marcada como paga com sucesso', 
            saleStatus: sale.paga ? 'Pago' : 'Pendente'
        });
    } catch (error) {
        console.error('Erro ao marcar venda/parcela como paga:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Adicione esta nova rota para gerar o arquivo de remessa
app.get('/api/generate-remessa/:saleId', authenticateToken, async (req, res) => {
    try {
        const saleId = req.params.saleId;
        const sales = await readJSONFile(salesFile);
        const sale = sales.find(s => s.id === saleId);

        if (!sale) {
            return res.status(404).json({ message: 'Venda não encontrada' });
        }

        // Aqui você deve implementar a lógica para gerar o conteúdo do arquivo de remessa
        // Este é apenas um exemplo simples, você precisará ajustar de acordo com as especificaões do seu banco
        const remessaContent = generateRemessaContent(sale);

        // Crie um arquivo temporário
        const tempFilePath = path.join(__dirname, 'temp', `remessa_${saleId}.rem`);
        await fs.writeFile(tempFilePath, remessaContent);

        // Envie o arquivo como resposta
        res.download(tempFilePath, `remessa_${saleId}.rem`, (err) => {
            if (err) {
                console.error('Erro ao enviar arquivo:', err);
                res.status(500).send('Erro ao gerar arquivo de remessa');
            }
            // Remova o arquivo temporário após o envio
            fs.unlink(tempFilePath).catch(console.error);
        });
    } catch (error) {
        console.error('Erro ao gerar remessa:', error);
        res.status(500).json({ message: 'Erro ao gerar arquivo de remessa' });
    }
});

function generateRemessaContent(sale) {
    // Implemente a lógica para gerar o conteúdo do arquivo de remessa
    // Este é apenas um exemplo simples
    return `REMESSA
Venda: ${sale.numero}
Cliente: ${sale.cliente}
Valor: ${sale.valorFinal}
Data: ${sale.data}
// Adicione mais informações conforme necessário
`;
}

// Adicione esta rota ao seu arquivo server.js
app.post('/api/mark-parcel-as-paid', authenticateToken, (req, res) => {
    const { saleId, parcelIndex } = req.body;
    console.log('Received request to mark parcel as paid:', saleId, parcelIndex);

    // Lê o arquivo de vendas
    fs.readFile('data/sales.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading sales file:', err);
            return res.status(500).json({ success: false, message: 'Erro ao ler o arquivo de vendas' });
        }

        let sales = JSON.parse(data);
        const saleIndex = sales.findIndex(sale => sale.id === saleId);

        if (saleIndex === -1) {
            return res.status(404).json({ success: false, message: 'Venda não encontrada' });
        }

        const sale = sales[saleIndex];

        if (!sale.parcelas || !Array.isArray(sale.parcelas) || parcelIndex >= sale.parcelas.length) {
            return res.status(400).json({ success: false, message: 'Parcela inválida' });
        }

        sale.parcelas[parcelIndex].paga = true;

        // Verifica se todas as parcelas foram pagas
        const allPaid = sale.parcelas.every(parcela => parcela.paga);
        if (allPaid) {
            sale.paga = true;
            sale.situacao = 'Recebido';
        }

        // Escreve as alterações de volta no arquivo
        fs.writeFile('data/sales.json', JSON.stringify(sales, null, 2), (writeErr) => {
            if (writeErr) {
                console.error('Error writing sales file:', writeErr);
                return res.status(500).json({ success: false, message: 'Erro ao atualizar o arquivo de vendas' });
            }

            res.json({ success: true, saleStatus: sale.situacao });
        });
    });
});

// Adicione este middleware antes das rotas para logar todas as requisições
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Quando registrar as rotas do WhatsApp
console.log('Registrando rotas do WhatsApp...');
app.use('/api/whatsapp', whatsappRoutes);
console.log('Rotas do WhatsApp registradas');

// MOVA AS NOVAS ROTAS PARA AQUI - ANTES DOS MIDDLEWARES DE ERRO

// Rota para cheques a vencer
app.get('/api/cheques-a-vencer', async (req, res) => {
    try {
        const cheques = await readJSONFile(chequesFile);
        const hoje = new Date();
        const chequesAVencer = cheques.filter(cheque => {
            const dataCompensacao = new Date(cheque.dataCompensacao);
            return dataCompensacao > hoje && !cheque.compensado;
        });

        const valorTotal = chequesAVencer.reduce((total, cheque) => total + parseFloat(cheque.valor || 0), 0);

        res.json({
            count: chequesAVencer.length,
            valor: valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cheques a vencer' });
    }
});

// Rota para vendas do mês
app.get('/api/vendas-do-mes/:offset?', async (req, res) => {
    try {
        const vendas = await readJSONFile(salesFile);
        const hoje = new Date();
        const offset = parseInt(req.params.offset || 0);
        
        // Calcular o primeiro e último dia do mês desejado
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() - offset, 1);
        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() - offset + 1, 0);

        const vendasDoMes = vendas.filter(venda => {
            const dataVenda = new Date(venda.data);
            return dataVenda >= primeiroDiaMes && dataVenda <= ultimoDiaMes;
        });

        const valorTotal = vendasDoMes.reduce((total, venda) => total + parseFloat(venda.valorFinal || 0), 0);

        // Adicionar o nome do mês na resposta
        const nomeMes = primeiroDiaMes.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        res.json({
            count: vendasDoMes.length,
            valor: valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            mes: nomeMes
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar vendas do mês' });
    }
});

// Rota para boletos a vencer
app.get('/api/boletos-a-vencer', async (req, res) => {
    try {
        const vendas = await readJSONFile(salesFile);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Zera as horas para comparação apenas da data
        
        let boletosAVencer = 0;
        let valorTotal = 0;
        let detalhes = []; // Array para armazenar detalhes dos boletos

        // Filtra apenas vendas com formaPagamento "Boleto Bancário"
        const vendasBoleto = vendas.filter(venda => venda.formaPagamento === "Boleto Bancário");

        vendasBoleto.forEach(venda => {
            if (venda.parcelas && Array.isArray(venda.parcelas)) {
                venda.parcelas.forEach(parcela => {
                    // Converte a data do formato "YYYY/MM/DD" para Date
                    const [ano, mes, dia] = parcela.data.split('/');
                    const dataVencimento = new Date(ano, mes - 1, dia);
                    dataVencimento.setHours(0, 0, 0, 0);

                    // Verifica se o boleto não está pago e a data de vencimento é futura
                    if (!parcela.paga && dataVencimento >= hoje) {
                        boletosAVencer++;
                        const valor = parseFloat(parcela.valor || 0);
                        valorTotal += valor;

                        // Adiciona detalhes do boleto
                        detalhes.push({
                            cliente: venda.cliente,
                            vencimento: dataVencimento,
                            valor: valor.toLocaleString('pt-BR', { 
                                style: 'currency', 
                                currency: 'BRL' 
                            }),
                            numeroParcela: `${parcela.numero}/${venda.quantidadeParcelas}`,
                            numeroVenda: venda.numero || 'N/A'
                        });
                    }
                });
            }
        });

        // Ordena os detalhes por data de vencimento
        detalhes.sort((a, b) => a.vencimento - b.vencimento);

        // Formata as datas após a ordenação
        detalhes = detalhes.map(detalhe => ({
            ...detalhe,
            vencimento: detalhe.vencimento.toLocaleDateString('pt-BR')
        }));

        res.json({
            count: boletosAVencer,
            valor: valorTotal.toLocaleString('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
            }),
            detalhes: detalhes
        });
    } catch (error) {
        console.error('Erro ao buscar boletos a vencer:', error);
        res.status(500).json({ error: 'Erro ao buscar boletos a vencer' });
    }
});

// DEPOIS DAS ROTAS, ADICIONE OS MIDDLEWARES DE ERRO

// Middleware para lidar com erros de rota não encontrada
app.use((req, res, next) => {
    console.log(`Rota não encontrada: ${req.method} ${req.url}`);
    res.status(404).json({ 
        error: 'Rota não encontrada',
        path: req.url,
        method: req.method
    });
});

// Middleware para lidar com erros gerais
app.use((err, req, res, next) => {
    console.error('Erro na aplicação:', err);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: err.message
    });
});