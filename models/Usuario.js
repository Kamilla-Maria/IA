const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UsuarioSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: [true, 'O nome é obrigatório']
    },
    email: {
        type: String,
        required: [true, 'O email é obrigatório'],
        unique: true,
        lowercase: true,
        trim: true
    },
    senha: {
        type: String,
        required: [true, 'A senha é obrigatória'],
        select: false // Por segurança, não retorna a senha em consultas por padrão
    },
    dataCriacao: {
        type: Date,
        default: Date.now
    }
});

// --- SEGURANÇA (MIDDLEWARE) ---
// Antes de salvar no banco, transformamos a senha em um Hash Criptográfico
UsuarioSchema.pre('save', async function(next) {
    // Se a senha não foi modificada (ex: mudou apenas o nome), pula para o próximo passo
    if (!this.isModified('senha')) return next();

    try {
        // Gera um "sal" (salt) aleatório para fortalecer o hash
        const salt = await bcrypt.genSalt(10);
        
        // Substitui a senha original pela versão criptografada
        this.senha = await bcrypt.hash(this.senha, salt);
        
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Usuario', UsuarioSchema);