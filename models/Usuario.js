const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UsuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    senha: { type: String, required: true, select: false }
});

// Criptografa a senha antes de salvar
UsuarioSchema.pre('save', async function() {
    // Se a senha não foi mexida, não faz nada e sai
    if (!this.isModified('senha')) return;

    try {
        // Gera o "sal" (salt)
        const salt = await bcrypt.genSalt(10);
        // Criptografa a senha e substitui o texto puro pelo hash
        this.senha = await bcrypt.hash(this.senha, salt);
        
        // REPARE: Não usamos mais o next() aqui dentro quando a função é async!
    } catch (err) {
        throw err; // Se der erro, o Mongoose captura automaticamente
    }
});

module.exports = mongoose.model('Usuario', UsuarioSchema);