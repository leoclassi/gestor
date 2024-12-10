const mongoose = require('mongoose');

const contatoSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true
    },
    telefone: {
        type: String,
        required: true,
        unique: true
    },
    grupo: {
        type: String,
        default: 'Geral'
    },
    aceitouMarketing: {
        type: Boolean,
        default: true
    },
    dataCadastro: {
        type: Date,
        default: Date.now
    },
    ultimaMensagem: {
        type: Date
    },
    tags: [String],
    observacoes: String
});

module.exports = mongoose.model('Contato', contatoSchema); 