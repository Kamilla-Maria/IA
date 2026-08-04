const jwt = require('jsonwebtoken');

/**
 * Middleware: autenticarToken
 * Objetivo: Barrar qualquer requisição que não possua um JWT válido.
 */
const autenticarToken = (req, res, next) => {
    // 1. Pega o cabeçalho 'Authorization' da requisição
    const authHeader = req.headers['authorization'];
    
    // 2. O formato esperado é "Bearer <TOKEN>", então dividimos pelo espaço
    // Se o header existir, pegamos a segunda parte (o token em si)
    const token = authHeader && authHeader.split(' ')[1];

    // 3. Se não houver token, barramos a entrada (401 - Não Autorizado)
    if (!token) {
        return res.status(401).json({ 
            erro: "Acesso negado! Você precisa estar logado para entrar aqui. 🎀" 
        });
    }

    try {
        // 4. Tenta validar o token usando a nossa chave secreta
        const dadosUsuario = jwt.verify(token, process.env.JWT_SECRET);
        
        // 5. Se o token for válido, anexamos os dados do usuário (id e nome) na requisição
        // Assim, os próximos controladores saberão QUEM está fazendo o pedido
        req.usuario = dadosUsuario;

        // 6. Autoriza a continuação para a rota desejada
        next();
    } catch (error) {
        // 7. Se o token for falso, expirado ou alterado, barramos
        return res.status(401).json({ 
            erro: "Seu 'crachá digital' é inválido ou expirou. Faça login novamente." 
        });
    }
};

module.exports = autenticarToken;