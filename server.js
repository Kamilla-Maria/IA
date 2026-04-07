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
        // Pega a pergunta que veio do corpo da requisição (JSON)
        const { pergunta } = req.body;

        if (!pergunta) {
            return res.status(400).json({ erro: "Você precisa enviar uma 'pergunta' no formato JSON." });
        }

        console.log(`📩 Nova pergunta recebida: "${pergunta}"`);

        // Chama a IA do Google
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        // Dica: Você pode concatenar uma instrução de sistema aqui!
        const promptFinal = `Você é um robô sarcástico. Responda a seguinte pergunta: ${pergunta}`;
        
        const result = await model.generateContent(promptFinal);
        const respostaDaIA = result.response.text();

        // DEVOLVE a resposta para quem chamou a API, no formato JSON
        return res.status(200).json({ 
            sucesso: true,
            resposta: respostaDaIA 
        });

    } catch (erro) {
        console.error("❌ Erro no servidor:", erro);
        return res.status(500).json({ erro: "Erro interno no servidor de IA." });
    }
});

// A nuvem define a porta via process.env.PORT. Se não houver, usa a 3000 (local)
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`🚀 Servidor rodando na porta ${PORTA}`);
});

