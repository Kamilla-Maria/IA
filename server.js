// Adicione junto com suas outras importações
const mongoose = require('mongoose');

// Conectando ao Banco de Dados Nuvem
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('📦 Conectado ao MongoDB Atlas!'))
  .catch((err) => console.error('❌ Erro no banco:', err));

// Definindo como a mensagem será salva no banco
const MensagemSchema = new mongoose.Schema({
    role: String, // 'user' (usuário) ou 'model' (IA)
    parts: [{ text: String }], // O conteúdo da mensagem
    dataHora: { type: Date, default: Date.now } // Hora exata
});

// Criando a "Tabela" (Collection) baseada no Schema
const Mensagem = mongoose.model('Mensagem', MensagemSchema);

// 1. Importações (Bibliotecas)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 2. Configurações Iniciais do Servidor
const app = express();
app.use(express.json()); // Permite que o servidor entenda JSON
app.use(cors()); // Permite que front-ends se conectem sem bloqueio

// 3. Configuração da IA
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// 4. CRIANDO A ROTA (Endpoint) DA API
// Vamos usar o método POST, pois estamos ENVIANDO uma pergunta para o servidor
app.post('/api/chat', async (req, res) => {
    try {
        // Capturamos 'message' e 'modelo' do corpo da requisição
        const { message, modelo } = req.body; 
        
        // Define um modelo padrão caso o front-end não envie um válido
        const modeloParaUsar = modelo || "gemini-1.5-flash";

        if (!message) return res.status(400).json({ erro: "Envie uma mensagem." });

        // 1. Salva a pergunta do usuário no Banco
        await Mensagem.create({ role: "user", parts: [{ text: message }] });

        // 2. Busca o histórico (últimas 20)
        const historico = await Mensagem.find()
                                        .select('role parts -_id') 
                                        .sort({ dataHora: 1 })
                                        .limit(20);

        // 3. Inicia o modelo escolhido dinamicamente
        const model = genAI.getGenerativeModel({ 
            model: modeloParaUsar,
            // Mantendo a personalidade do seu Piá-bot (ajuste se for Hello Kitty)
            systemInstruction: "Você é o ELO (Piá-bot), um assistente do IFPR Campus Assis. Use gírias paranaenses e seja amigável."
        });

        const chat = model.startChat({
            history: historico,
        });

        // 4. Manda a pergunta para a IA
        const result = await chat.sendMessage(message);
        const respostaDaIA = result.response.text();

        // 5. Salva a resposta da IA no Banco
        await Mensagem.create({ role: "model", parts: [{ text: respostaDaIA }] });

        // 6. Responde ao Front-end
        return res.status(200).json({ sucesso: true, reply: respostaDaIA });

    } catch (erro) {
        console.error("❌ Erro no servidor:", erro);
        return res.status(500).json({ erro: "Erro ao processar sua pergunta." });
    }
});


// A nuvem define a porta via process.env.PORT. Se não houver, usa a 3000 (local)
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`🚀 Servidor rodando na porta ${PORTA}`);
});

