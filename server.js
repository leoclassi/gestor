const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = 3000;
const axios = require('axios');

app.use(bodyParser.json());
app.use(express.static('public'));

const productsFile = path.join(__dirname, 'data', 'products.json');
const clientsFile = path.join(__dirname, 'data', 'clients.json');
const salesFile = path.join(__dirname, 'data', 'sales.json');

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
    const sales = await readJSONFile(salesFile);
    res.json(sales);
});

app.post('/api/sales', async (req, res) => {
    const sales = await readJSONFile(salesFile);
    const newSale = req.body;
    newSale.id = Date.now().toString();
    sales.push(newSale);
    await writeJSONFile(salesFile, sales);
    res.json(newSale);
});

app.put('/api/sales/:id', async (req, res) => {
    const sales = await readJSONFile(salesFile);
    const index = sales.findIndex(s => s.id === req.params.id);
    if (index !== -1) {
        sales[index] = { ...sales[index], ...req.body };
        await writeJSONFile(salesFile, sales);
        res.json(sales[index]);
    } else {
        res.status(404).json({ error: 'Sale not found' });
    }
});

app.delete('/api/sales/:id', async (req, res) => {
    const sales = await readJSONFile(salesFile);
    const filteredSales = sales.filter(s => s.id !== req.params.id);
    await writeJSONFile(salesFile, filteredSales);
    res.json({ message: 'Sale deleted' });
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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});