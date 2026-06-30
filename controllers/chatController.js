const Mensagem = require('../models/Mensagem');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inicializa a IA
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- PASSO 1: FUNÇÃO REAL ---
async function buscarClimaTempoReal(cidade) {
    const API_KEY = process.env.WEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&appid=${API_KEY}&units=metric&lang=pt_br`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.cod !== 200) return { erro: "Cidade não encontrada. 🎀" };

        return {
            temperatura: `${Math.round(data.main.temp)}°C`,
            descricao: data.weather[0].description,
            cidade: data.name
        };
    } catch (error) {
        return { erro: "Erro ao buscar clima. 🎀" };
    }
}

// --- PASSO 2: MANUAL DE INSTRUÇÕES ---
const declaracaoClima = {
    name: "buscarClimaTempoReal",
    description: "Obtém a temperatura atual de uma cidade. Use sempre que o usuário perguntar sobre o tempo.",
    parameters: {
        type: "OBJECT",
        properties: {
            cidade: { type: "STRING", description: "O nome da cidade." }
        },
        required: ["cidade"]
    }
};

// --- FUNÇÃO PRINCIPAL ---
exports.falarComIA = async (req, res) => {
    try {
        // Pega a mensagem (message ou pergunta)
        const userMsg = req.body.message || req.body.pergunta;

        if (!userMsg) return res.status(400).json({ erro: "Mensagem vazia!" });

        // Busca histórico
        const historico = await Mensagem.find().sort({ dataHora: 1 }).limit(10);
        const history = historico.map(m => ({ role: m.role, parts: m.parts }));

        // PASSO 3: Configura o modelo
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.1-flash-lite",
            systemInstruction: "Você é a Hello Kitty, uma assistente fofa e gentil. Use emojis."
        });

        const chat = model.startChat({
            history: history,
            tools: [{ functionDeclarations: [declaracaoClima] }]
        });

        // PASSO 4: Envia e trata Function Calling
        const result = await chat.sendMessage(userMsg);
        const response = result.response;
        
        // Verifica se há pedido de função
        const call = response.candidates[0].content.parts.find(p => p.functionCall);

        let respostaFinal;

        if (call) {
            const { name, args } = call.functionCall;
            if (name === "buscarClimaTempoReal") {
                const dados = await buscarClimaTempoReal(args.cidade);
                // Devolve para a IA
                const result2 = await chat.sendMessage([{
                    functionResponse: { name: "buscarClimaTempoReal", response: dados }
                }]);
                respostaFinal = result2.response.text();
            }
        } else {
            respostaFinal = response.text();
        }

        // Salva no Banco
        await Mensagem.create({ role: "user", parts: [{ text: userMsg }] });
        await Mensagem.create({ role: "model", parts: [{ text: respostaFinal }] });

        res.json({ resposta: respostaFinal });

    } catch (erro) {
        // LOG DO ERRO NO TERMINAL (Isso vai nos dizer o que houve)
        console.error("❌ ERRO NO CONTROLADOR:", erro);
        res.status(500).json({ erro: "Erro interno", detalhes: erro.message });
    }
};

exports.limparHistorico = async (req, res) => {
    try {
        await Mensagem.deleteMany({});
        res.json({ mensagem: "Histórico limpo! 🎀" });
    } catch (e) { res.status(500).send(e); }
};