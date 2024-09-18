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

app.use(bodyParser.json());
app.use(express.static('public'));

const productsFile = path.join(__dirname, 'data', 'products.json');
const clientsFile = path.join(__dirname, 'data', 'clients.json');
const salesFile = path.join(__dirname, 'data', 'sales.json');
const usersFile = path.join(__dirname, 'data', 'users.json');
const chequesFile = path.join(__dirname, 'data', 'cheques.json');
require('dotenv').config();
const SECRET_KEY = process.env.SECRET_KEY;

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
    const sales = await readJSONFile(salesFile);
    const sale = sales.find(s => s.id === req.params.id);
    if (sale) {
        res.json(sale);
    } else {
        res.status(404).json({ error: 'Sale not found' });
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
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    const users = await readJSONFile(usersFile);

    const userExists = users.find(user => user.username === username);
    if (userExists) {
        return res.status(400).json({ error: 'Usuário já existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now().toString(), username, password: hashedPassword };
    users.push(newUser);
    await writeJSONFile(usersFile, users);

    res.status(201).json({ message: 'Usuário registrado com sucesso' });
});

// Rota de login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = await readJSONFile(usersFile);

    const user = users.find(user => user.username === username);
    if (!user) {
        return res.status(400).json({ error: 'Usuário não encontrado' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(400).json({ error: 'Senha incorreta' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
});

// Middleware de autenticação
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extrai o token após 'Bearer'

    if (!token) return res.sendStatus(401); // Não autorizado

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403); // Proibido
        req.user = user;
        next();
    });
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
            res.json({ message: result.message });
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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});