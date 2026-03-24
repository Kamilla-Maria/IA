require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Configurações para o servidor entender JSON e arquivos HTML
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Histórico de conversas (simples, em memória)
let conversationHistory = [];

// ROTA DA IA: Onde o site vai pedir a resposta
app.post('/perguntar', async (req, res) => {
    const { pergunta, modelo } = req.body;
    
    try {
        // Adicionar a pergunta do usuário ao histórico
        conversationHistory.push({ role: 'user', content: pergunta });
        
        // Limitar o histórico a 20 mensagens para não sobrecarregar
        if (conversationHistory.length > 20) {
            conversationHistory = conversationHistory.slice(-20);
        }
        
        const model = genAI.getGenerativeModel({ model: modelo || "gemini-3-flash-preview" });
        
        // Construir o prompt com histórico
        let promptComHistorico = "Você é a Hello Kitty, uma personagem fofinha, gentil e amigável. Responda de forma breve e doce.\n\nHistórico da conversa:\n";
        conversationHistory.forEach(msg => {
            promptComHistorico += `${msg.role === 'user' ? 'Usuário' : 'Hello Kitty'}: ${msg.content}\n`;
        });
        promptComHistorico += "Hello Kitty: ";
        
        const result = await model.generateContent(promptComHistorico);
        const resposta = result.response.text();
        
        // Adicionar a resposta ao histórico
        conversationHistory.push({ role: 'assistant', content: resposta });
        
        res.json({ resposta });
    } catch (erro) {
        console.error('Erro na IA:', erro);
        res.status(500).json({ erro: "Erro ao conectar com a IA" });
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});