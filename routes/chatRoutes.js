const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const autenticarToken = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.post('/', autenticarToken, chatController.falarComIA);
router.post('/vision', autenticarToken, upload.single('image'), chatController.analisarImagem);
router.get('/ranking', autenticarToken, chatController.obterRanking);
router.delete('/limpar', autenticarToken, chatController.limparHistorico);

module.exports = router;