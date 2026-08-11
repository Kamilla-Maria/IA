const multer = require('multer');

// Configura o multer para guardar o arquivo temporariamente na memória RAM
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

module.exports = upload;