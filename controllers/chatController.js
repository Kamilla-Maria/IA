const Mensagem = require('../models/Mensagem');
const Jogador = require('../models/Jogador');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inicializa a IA
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Função para dar XP no banco
async function adicionarXP(nickname, quantidade) {
    try {
        const jogador = await Jogador.findOneAndUpdate(
            { nickname: nickname },
            { $inc: { xp: Math.round(quantidade) } }, // Garante que é número inteiro
            { upsert: true, new: true }
        );
        return { sucesso: true, novoXP: jogador.xp };
    } catch (error) {
        console.error("Erro ao atualizar XP:", error);
        return { erro: "Erro no banco ao dar XP" };
    }
}

// Configuração da ferramenta de XP
const declaracaoXP = {
    name: "adicionarXP",
    description: "Adiciona pontos de XP ao jogador quando ele acerta uma charada.",
    parameters: {
        type: "OBJECT",
        properties: {
            nickname: { type: "STRING", description: "O apelido do jogador" },
            quantidade: { type: "NUMBER", description: "A quantidade de XP (use 50 para acerto e -10 para erro)" }
        },
        required: ["nickname", "quantidade"]
    }
};

exports.falarComIA = async (req, res) => {
    try {
        const { message, nickname } = req.body;
        const userMsg = message || req.body.pergunta;

        if (!userMsg) return res.status(400).json({ erro: "Mensagem vazia" });

        // 1. Limpa o histórico para o formato exato da API
        const historicoBruto = await Mensagem.find().sort({ dataHora: 1 }).limit(10);
        const history = historicoBruto.map(m => ({
            role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
            parts: [{ text: m.parts[0].text }]
        }));

        // 2. Configura o modelo (Usando a versão 2.0 que é a mais estável hoje)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview" 
        });

        // 3. Inicia o Chat com as instruções do sistema
        const chat = model.startChat({
            history: history,
            generationConfig: { maxOutputTokens: 500 },
            tools: [{ functionDeclarations: [declaracaoXP] }],
            systemInstruction: {
                role: "system",
                parts: [{ text: `Você é a Hello Kitty Game Master. Proponha charadas curtas de tecnologia para o jogador ${nickname || 'Amigo'}. 
                REGRAS:
                1. Se ele acertar a charada, use obrigatoriamente a função adicionarXP com 50 pontos.
                2. Se ele errar ou pedir a resposta, use a função adicionarXP com -10 pontos.
                3. Use muitos emojis e seja gentil.` }]
            }
        });

        // 4. Envia a mensagem
        const result = await chat.sendMessage(userMsg);
        const response = await result.response;
        
        // Verifica se a IA quer chamar a função de XP
        const call = response.candidates[0].content.parts.find(p => p.functionCall);

        let respostaFinal = "";

        if (call) {
            const { name, args } = call.functionCall;
            if (name === "adicionarXP") {
                const resultadoXP = await adicionarXP(nickname || "Jogador", args.quantidade);
                
                // Responde para a IA que a função foi executada
                const result2 = await chat.sendMessage([{
                    functionResponse: { 
                        name: "adicionarXP", 
                        response: resultadoXP 
                    }
                }]);
                respostaFinal = result2.response.text();
            }
        } else {
            respostaFinal = response.text();
        }

        // 5. Salva no banco de dados para a Hello Kitty ter memória
        await Mensagem.create({ role: "user", parts: [{ text: userMsg }] });
        await Mensagem.create({ role: "model", parts: [{ text: respostaFinal }] });

        res.json({ resposta: respostaFinal });

    } catch (erro) {
        console.error("❌ ERRO NO SERVIDOR:", erro.message);
        res.status(500).json({ 
            erro: "Ocorreu um erro na IA", 
            detalhes: erro.message 
        });
    }
};

// Outras rotas (Ranking e Limpar)
exports.obterRanking = async (req, res) => {
    try {
        const jogadores = await Jogador.find().sort({ xp: -1 }).limit(10);
        res.json(jogadores);
    } catch (e) {
        res.status(500).json({ erro: "Erro ao buscar ranking" });
    }
};

exports.limparHistorico = async (req, res) => {
    try {
        await Mensagem.deleteMany({});
        res.json({ mensagem: "Histórico limpo! 🎀" });
    } catch (e) {
        res.status(500).json({ erro: "Erro ao limpar" });
    }
};