const mongoose = require('mongoose');

const MensagemSchema = new mongoose.Schema({
    role: { 
        type: String, 
        required: true // 'user' ou 'model'
    },
    parts: [{
        text: { type: String }
    }],
    dataHora: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Mensagem', MensagemSchema);