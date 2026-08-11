const Mensagem = require('../models/Mensagem');
const Jogador = require('../models/Jogador');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configurações
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Lógica de XP
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

// --- ROTA DE TEXTO (Charadas) ---
exports.falarComIA = async (req, res) => {
    try {
        const { message, nickname } = req.body;
        if (!message) return res.status(400).json({ erro: "Mensagem vazia" });

        // 1. Busca histórico e garante que as roles sejam apenas 'user' ou 'model'
        const historicoBruto = await Mensagem.find().sort({ dataHora: 1 }).limit(10);
        
        const history = historicoBruto
            .filter(m => m.parts && m.parts[0] && m.parts[0].text) 
            .map(m => ({
                role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
                parts: [{ text: m.parts[0].text }]
            }));

        // 2. Modelo CORRETO (Gemini 1.5 Flash)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 3. Inicia o chat
        const chat = model.startChat({
            history: history,
            tools: [{ functionDeclarations: [declaracaoXP] }],
            systemInstruction: {
                role: "system",
                parts: [{ text: `Você é a Hello Kitty Game Master. Seja fofa, use muitos emojis e proponha charadas para ${nickname}. Se ele acertar, use a função adicionarXP com 50 pontos.` }]
            }
        });

        // 4. Envia a mensagem
        const result = await chat.sendMessage(message);
        const response = await result.response;
        
        let respostaFinal = "";

        // 5. Tratamento de Function Call (XP) corrigido
        const call = response.candidates[0].content.parts.find(p => p.functionCall);
        
        if (call) {
            const { name, args } = call.functionCall;
            if (name === "adicionarXP") {
                const resXP = await adicionarXP(nickname, args.quantidade);
                
                // O segredo está aqui: enviamos a resposta da função de volta para a IA
                const result2 = await chat.sendMessage([{
                    functionResponse: {
                        name: "adicionarXP",
                        response: resXP
                    }
                }]);
                respostaFinal = result2.response.text();
            }
        } else {
            respostaFinal = response.text();
        }

        // 6. Salva no banco
        await Mensagem.create({ role: "user", parts: [{ text: message }] });
        await Mensagem.create({ role: "model", parts: [{ text: respostaFinal }] });

        res.json({ resposta: respostaFinal });

    } catch (error) {
        console.error("❌ ERRO NO SERVIDOR:", error);
        res.status(500).json({ 
            erro: "A Hello Kitty se atrapalhou!", 
            detalhes: error.message 
        });
    }
};

// --- ROTA DE VISÃO (Imagens) ---
exports.analisarImagem = async (req, res) => {
    try {
        const { prompt, nickname } = req.body;
        const arquivo = req.file;
        if (!arquivo) return res.status(400).json({ erro: "Envie uma foto!" });

        // Upload Cloudinary
        const uploadCloud = () => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream((err, res) => res ? resolve(res) : reject(err));
                streamifier.createReadStream(arquivo.buffer).pipe(stream);
            });
        };
        const cloudRes = await uploadCloud();

        // Gemini Vision
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imagePart = { inlineData: { data: arquivo.buffer.toString("base64"), mimeType: arquivo.mimetype } };
        
        const result = await model.generateContent([
            `Você é a Hello Kitty. O jogador ${nickname} enviou uma foto. Seja fofa e comente a imagem.`,
            prompt || "O que é isso?",
            imagePart
        ]);

        const resposta = result.response.text();
        await Mensagem.create({ role: "user", parts: [{ text: "[FOTO] " + (prompt || "") }] });
        await Mensagem.create({ role: "model", parts: [{ text: resposta }] });

        res.json({ resposta, imageUrl: cloudRes.secure_url });
    } catch (e) { res.status(500).json({ erro: e.message }); }
};

exports.obterRanking = async (req, res) => {
    const jogadores = await Jogador.find().sort({ xp: -1 }).limit(10);
    res.json(jogadores);
};

exports.limparHistorico = async (req, res) => {
    await Mensagem.deleteMany({});
    res.json({ mensagem: "Limpo! 🎀" });
};