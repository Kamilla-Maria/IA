// 1. CARREGAMENTO DO AMBIENTE
require('dotenv').config(); 

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// --- IMPORTAÇÕES DO HTTP, SOCKET.IO E JWT ---
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Models do Mongoose (Carregados apenas aqui no server.js)
const Mensagem = require('./models/mensagem');
const Jogador = require('./models/Jogador');

const chatRoutes = require('./routes/chatRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Conexão com o Banco
if (!process.env.MONGO_URI) {
    console.error("❌ ERRO CRÍTICO: MONGO_URI não encontrada!");
} else {
    mongoose.connect(process.env.MONGO_URI)
      .then(() => console.log('📦 Conectado ao MongoDB Atlas!'))
      .catch((err) => console.error('❌ Erro de conexão:', err));
}

// Rotas Express
app.get('/api/health', async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1;
    res.status(dbStatus ? 200 : 503).json({ status: dbStatus ? "ok" : "erro" });
});
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// ==========================================
// 🛡️ SEGURANÇA (MIDDLEWARE DO SOCKET.IO - JWT)
// ==========================================
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Acesso negado! Token não fornecido."));

    try {
        const usuarioValido = jwt.verify(token, process.env.JWT_SECRET || 'secreto_temporario');
        socket.usuario = usuarioValido; 
        next();
    } catch (erro) {
        return next(new Error("Token inválido ou expirado!"));
    }
});

// Função interna de XP
async function adicionarXP(nickname, quantidade) {
    try {
        const jogador = await Jogador.findOneAndUpdate(
            { nickname: nickname },
            { $inc: { xp: Math.round(quantidade) } },
            { upsert: true, new: true }
        );
        return { sucesso: true, novoXP: jogador.xp };
    } catch (error) {
        return { erro: "Erro ao atualizar XP" };
    }
}

const declaracaoXP = {
    name: "adicionarXP",
    description: "Adiciona XP ao jogador. Use 50 para acerto e -10 para erro.",
    parameters: {
        type: "OBJECT",
        properties: {
            nickname: { type: "STRING" },
            quantidade: { type: "NUMBER" }
        },
        required: ["nickname", "quantidade"]
    }
};

// ==========================================
// ⚡ EVENTOS DO SOCKET.IO (COM A LOGICA DE JOGO)
// ==========================================
io.on('connection', (socket) => {
    console.log(`🔌 Conectado: ${socket.id} | Usuário: ${socket.usuario.nome}`);

    socket.on('novaMensagem', async (dados) => {
        const nickname = socket.usuario.nome;
        const message = dados.message;

        if (!message) return;

        // 1. Envia imediatamente a mensagem do usuário para a tela de TODOS
        io.emit('mensagemRecebida', { nickname: nickname, message: message });

        try {
            // 2. Busca o histórico no MongoDB
            const historicoBruto = await Mensagem.find().sort({ dataHora: 1 }).limit(10);
            const history = historicoBruto
                .filter(m => m.parts && m.parts[0] && m.parts[0].text) 
                .map(m => ({
                    role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
                    parts: [{ text: m.parts[0].text }]
                }));

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const chat = model.startChat({
                history: history,
                tools: [{ functionDeclarations: [declaracaoXP] }],
                systemInstruction: {
                    role: "system",
                    parts: [{ text: `Você é a Hello Kitty Game Master. Seja fofa, use muitos emojis e conduza um jogo de charadas interativo para ${nickname}. Se ele acertar a charada, use a função adicionarXP com 50 pontos. Mantenha o contexto do jogo.` }]
                }
            });

            // 3. Envia para a IA
            const result = await chat.sendMessage(message);
            const response = await result.response;
            let respostaFinal = "";

            // 4. Trata o Function Calling (XP)
            const call = response.candidates[0]?.content?.parts?.find(p => p.functionCall);
            if (call) {
                const { name, args } = call.functionCall;
                if (name === "adicionarXP") {
                    const qtd = args.quantidade || 50;
                    await adicionarXP(nickname, qtd);
                    respostaFinal = `Acertou em cheio, ${nickname}! 🎉 Você ganhou +${qtd} XP! 🎀✨ Clique no botão "Rank" para ver sua pontuação subir! Quer outra charada?`;
                } else {
                    respostaFinal = response.text();
                }
            } else {
                respostaFinal = response.text();
            }

            // 5. Salva no banco de dados
            await Mensagem.create({ role: "user", parts: [{ text: message }] });
            await Mensagem.create({ role: "model", parts: [{ text: respostaFinal }] });

            // 6. Envia a resposta da IA via WebSocket para TODAS as abas
            io.emit('mensagemRecebida', {
                nickname: "Hello Kitty 🎀",
                message: respostaFinal,
                isBot: true
            });

        } catch (error) {
            console.error("❌ Erro na IA:", error);
            io.emit('mensagemRecebida', {
                nickname: "Hello Kitty 🎀",
                message: "A tia Hello Kitty se confundiu nos lacinhos! Tenta mandar de novo, minha fofinha? 😿🎀",
                isBot: true
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ Desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT} (Tudo integrado com sucesso!)`);
});