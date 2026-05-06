// routes/comentarios.js
const express            = require('express');
const router             = express.Router();
const { verificarToken } = require('../middleware/auth');
const interController    = require('../controllers/interaccionesController');

router.delete('/:id', verificarToken, interController.eliminarComentario);

module.exports = router;