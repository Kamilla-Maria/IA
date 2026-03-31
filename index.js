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

// Histórico de conversas
let conversationHistory = [];

app.post('/perguntar', async (req, res) => {
    // Usando o gemini-1.5-flash por padrão
    const modeloEscolhido = req.body.modelo || "gemini-2.5-flash";
    const pergunta = req.body.pergunta;
    
    console.log(`📩 Pergunta recebida: "${pergunta}" | 🤖 Modelo: ${modeloEscolhido}`);

    try {
        conversationHistory.push({ role: 'user', content: pergunta });
        
        if (conversationHistory.length > 20) {
            conversationHistory = conversationHistory.slice(-20);
        }
        
        const model = genAI.getGenerativeModel({ model: modeloEscolhido });
        
        let promptComHistorico = "Você é a Hello Kitty, uma personagem fofinha, gentil e amigável. Responda de forma breve e doce.\n\nHistórico da conversa:\n";
        conversationHistory.forEach(msg => {
            promptComHistorico += `${msg.role === 'user' ? 'Usuário' : 'Hello Kitty'}: ${msg.content}\n`;
        });
        promptComHistorico += "Hello Kitty: ";
        
        const result = await model.generateContent(promptComHistorico);
        const resposta = result.response.text();
        
        conversationHistory.push({ role: 'assistant', content: resposta });
        
        // Devolve a resposta com SUCESSO
        res.json({ sucesso: true, resposta: resposta });

    } catch (erro) {
        console.error('❌ Erro na IA:', erro.message);
        // Devolve o ERRO para o Front-end ler
        res.status(500).json({ 
            sucesso: false, 
            erro: "O Google recusou o modelo ou a chave falhou. Tente escolher outro modelo na lista!" 
        });
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor da Hello Kitty rodando em http://localhost:${port}`);
});