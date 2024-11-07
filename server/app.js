const express = require('express');
const app = express();
// ... outros imports ...

// Importe a rota do WhatsApp
const whatsappRoutes = require('./routes/whatsapp');

// ... outras configurações ...

// Registre a rota do WhatsApp
app.use('/api/whatsapp', whatsappRoutes);

// ... resto do código ... 