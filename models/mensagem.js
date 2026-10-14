const mongoose = require('mongoose');

const MensagemSchema = new mongoose.Schema({
    role: { 
        type: String, 
        required: true 
    },
    parts: [{
        text: { type: String }
    }],
    dataHora: { 
        type: Date, 
        default: Date.now 
    }
});

// Protege contra duplicação de compilação do Mongoose
module.exports = mongoose.models.Mensagem || mongoose.model('Mensagem', MensagemSchema);