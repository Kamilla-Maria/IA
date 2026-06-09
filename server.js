// 1. CARREGAMENTO DO AMBIENTE (ISSO DEVE SER A LINHA 1)
require('dotenv').config(); 

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const chatRoutes = require('./routes/chatRoutes');

// 2. LOG DE TESTE (Para vermos se o link carregou)
console.log("DEBUG: O link do banco carregado é:", process.env.MONGO_URI);

const app = express();
app.use(express.json());
app.use(cors());

// 3. CONEXÃO COM O BANCO
if (!process.env.MONGO_URI) {
    console.error("❌ ERRO CRÍTICO: A variável MONGO_URI não foi encontrada no arquivo .env!");
} else {
    mongoose.connect(process.env.MONGO_URI)
      .then(() => console.log('📦 Conectado ao MongoDB Atlas!'))
      .catch((err) => console.error('❌ Erro de conexão no banco:', err));
}

// No seu Back-end (server.js)
app.delete('/api/chat/limpar', async (req, res) => {
    try {
        await Mensagem.deleteMany({}); // Apaga tudo do MongoDB
        res.status(200).json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: "Erro ao limpar banco" });
    }
});
// 4. ROTAS
app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});