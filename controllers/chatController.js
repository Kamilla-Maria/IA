const Mensagem = require('../models/Mensagem');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.falarComIA = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ erro: "Envie uma mensagem." });

        // 1. Salva pergunta do usuário
        await Mensagem.create({ role: "user", parts: [{ text: message }] });

        // 2. Busca histórico recente
        const historico = await Mensagem.find().sort({ dataHora: 1 }).limit(20);
        
        // Formata histórico para o padrão que o Gemini entende
        const historicoFormatado = historico.map(m => ({
            role: m.role,
            parts: m.parts
        }));

        const model = genAI.getGenerativeModel({ 
            model: "gemini-pro-latest",
            systemInstruction: "Você é um assistente fofo e prestativo estilo Hello Kitty. Use emojis e seja gentil."
        });

        const chat = model.startChat({ history: historicoFormatado });
        const result = await chat.sendMessage(message);
        const respostaDaIA = result.response.text();

        // 3. Salva resposta da IA
        await Mensagem.create({ role: "model", parts: [{ text: respostaDaIA }] });

        res.json({ resposta: respostaDaIA });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao processar IA." });
    }
};

exports.limparHistorico = async (req, res) => {
    try {
        await Mensagem.deleteMany({});
        res.json({ mensagem: "Histórico limpo com sucesso!" });
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao limpar banco." });
    }
};