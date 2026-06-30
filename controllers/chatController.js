const Mensagem = require('../models/Mensagem');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inicializa a IA com a chave do .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * FERRAMENTA REAL: Busca o clima no OpenWeatherMap
 */
async function buscarClimaTempoReal(cidade) {
    const API_KEY = process.env.WEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&appid=${API_KEY}&units=metric&lang=pt_br`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod !== 200) {
            return { erro: "Não encontrei essa cidade, poxa... 🎀" };
        }

        return {
            temperatura: `${Math.round(data.main.temp)}°C`,
            descricao: data.weather[0].description,
            cidade: data.name,
            umidade: `${data.main.humidity}%`
        };
    } catch (error) {
        console.error("Erro na API de Clima:", error);
        return { erro: "O serviço de clima deu um probleminha. 🎀" };
    }
}

/**
 * DEFINIÇÃO DA FERRAMENTA PARA O GEMINI
 * Isso ensina a IA o que a função faz e quais parâmetros ela recebe.
 */
const tools = [
    {
        functionDeclarations: [
            {
                name: "buscarClimaTempoReal",
                description: "Obtém a temperatura e as condições climáticas atuais de uma cidade informada pelo usuário.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        cidade: {
                            type: "STRING",
                            description: "O nome da cidade para a qual deseja saber o clima, por exemplo: 'São Paulo', 'Londres', 'Rio de Janeiro'.",
                        },
                    },
                    required: ["cidade"],
                },
            },
        ],
    },
];

/**
 * CONTROLADOR PRINCIPAL: falarComIA
 */
// Fase 2: O Manual de Instruções (Declaration)
const declaracaoClima = {
    name: "buscarClimaTempoReal",
    description: "Obtém a temperatura exata e o clima atual de uma cidade. Use sempre que o usuário perguntar sobre o tempo ou temperatura.",
    parameters: {
        type: "OBJECT",
        properties: {
            cidade: {
                type: "STRING",
                description: "O nome da cidade. Ex: Assis Chateaubriand, Curitiba, Tokyo."
            }
        },
        required: ["cidade"]
    }
};

exports.falarComIA = async (req, res) => {
    try {
        // 1. Pega a mensagem do Front-end (ajustado para aceitar 'message' ou 'pergunta')
        const message = req.body.message || req.body.pergunta;

        if (!message) {
            return res.status(400).json({ erro: "Envie uma mensagem, por favor! 🎀" });
        }

        // 2. Busca histórico recente do banco (MongoDB) para ter memória
        const historicoDB = await Mensagem.find().sort({ dataHora: 1 }).limit(20);
        
        // Formata o histórico para o padrão que o Gemini exige
        const historicoFormatado = historicoDB.map(m => ({
            role: m.role,
            parts: m.parts
        }));

        // 3. PASSO 3: Inicializa o modelo com a Ferramenta (Cérebro + Manual)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash", // Modelo recomendado para Function Calling
            systemInstruction: "Você é a Hello Kitty, uma assistente fofa e gentil. Use emojis como 🎀 e 💕. Se o usuário perguntar sobre clima ou temperatura, use a ferramenta 'buscarClimaTempoReal'."
        });

        // 4. Inicia o Chat com o histórico e as ferramentas disponíveis
        const chat = model.startChat({
            history: historicoFormatado,
            tools: [{ functionDeclarations: [declaracaoClima] }] // declaracaoClima deve estar fora desta função
        });

        // 5. PASSO 4: O Loop de Conversação
        // Envia a primeira mensagem para a IA
        let result = await chat.sendMessage(message);
        let response = result.response;

        // Verifica se a IA decidiu que precisa chamar a função de clima
        const call = response.candidates[0].content.parts.find(p => p.functionCall);

        let respostaFinalTexto;

        if (call) {
            // Se a IA pediu a função, vamos extrair os dados
            const { name, args } = call.functionCall;

            if (name === "buscarClimaTempoReal") {
                console.log(`📡 Agente Hello Kitty consultando clima para: ${args.cidade}`);

                // Executa a função local que você criou no Passo 1
                const dadosClima = await buscarClimaTempoReal(args.cidade);

                // Envia o resultado da API de volta para a IA (O "vaivém")
                const resultFinal = await chat.sendMessage([
                    {
                        functionResponse: {
                            name: "buscarClimaTempoReal",
                            response: dadosClima
                        }
                    }
                ]);

                // Agora sim, temos o texto final fofinho da Hello Kitty com os dados reais
                respostaFinalTexto = resultFinal.response.text();
            }
        } else {
            // Se a IA não precisou de função (ex: "Oi, tudo bem?"), pega o texto direto
            respostaFinalTexto = response.text();
        }

        // 6. SALVAR NO BANCO: Registra a conversa para não esquecer
        await Mensagem.create({ role: "user", parts: [{ text: message }] });
        await Mensagem.create({ role: "model", parts: [{ text: respostaFinalTexto }] });

        // 7. RESPONDE AO FRONT-END
        res.json({ resposta: respostaFinalTexto });

    } catch (erro) {
        console.error("Erro Crítico na IA:", erro);
        res.status(500).json({ 
            erro: "Ops! Tive um probleminha técnico. Tente de novo? 🎀",
            detalhes: erro.message 
        });
    }
};

/**
 * CONTROLADOR: limparHistorico
 */
exports.limparHistorico = async (req, res) => {
    try {
        await Mensagem.deleteMany({});
        res.json({ mensagem: "Histórico limpo com sucesso! Vamos recomeçar? 💕" });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Não consegui limpar minha memória. 🎀" });
    }
};