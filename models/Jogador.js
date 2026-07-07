const mongoose = require('mongoose');

const JogadorSchema = new mongoose.Schema({
    nickname: { type: String, unique: true, required: true },
    xp: { type: Number, default: 0 }
});

module.exports = mongoose.model('Jogador', JogadorSchema);