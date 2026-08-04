const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const autenticarToken = require('../middlewares/authMiddleware'); // Importa o segurança

// PROTEGENDO AS ROTAS:
// Agora, para falar com a IA ou ver o ranking, o token é OBRIGATÓRIO
router.post('/', autenticarToken, chatController.falarComIA);
router.get('/ranking', autenticarToken, chatController.obterRanking);

// A rota de limpar também deve ser protegida
router.delete('/limpar', autenticarToken, chatController.limparHistorico);

module.exports = router;