const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Rota 1: Conversar (POST /api/chat)
router.post('/', chatController.falarComIA);

// Rota 2: Ranking (GET /api/chat/ranking)
router.get('/ranking', chatController.obterRanking);

// Rota 3: Limpar (DELETE /api/chat/limpar)
router.delete('/limpar', chatController.limparHistorico);

module.exports = router;