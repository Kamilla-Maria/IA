// 1. CARREGAMENTO DO AMBIENTE
require('dotenv').config(); 

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const chatRoutes = require('./routes/chatRoutes');
const authRoutes = require('./routes/authRoutes');

console.log("DEBUG: O link do banco carregado é:", process.env.MONGO_URI);

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// 3. CONEXÃO COM O BANCO
if (!process.env.MONGO_URI) {
    console.error("❌ ERRO CRÍTICO: A variável MONGO_URI não foi encontrada no arquivo .env!");
} else {
    mongoose.connect(process.env.MONGO_URI)
      .then(() => console.log('📦 Conectado ao MongoDB Atlas!'))
      .catch((err) => console.error('❌ Erro de conexão no banco:', err));
}

// ==========================================
// AQUI ESTÁ O PRIMEIRO CÓDIGO (HEALTH CHECK)
// ==========================================
app.get('/api/health', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState === 1;

        if (dbStatus) {
            return res.status(200).json({
                status: "ok",
                bancoDeDados: "conectado",
                timestamp: new Date().toISOString()
            });
        } else {
            return res.status(503).json({
                status: "erro",
                bancoDeDados: "desconectado",
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: "erro",
            bancoDeDados: "erro ao consultar",
            timestamp: new Date().toISOString()
        });
    }
});

// 4. ROTAS DA APLICAÇÃO
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});