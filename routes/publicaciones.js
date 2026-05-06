// routes/publicaciones.js
// Todas estas rutas requieren token JWT (verificarToken como middleware).

const express            = require('express');
const router             = express.Router();
const { verificarToken } = require('../middleware/auth');
const pubController      = require('../controllers/publicacionesController');
const interController    = require('../controllers/interaccionesController');

router.get('/',    verificarToken, pubController.listarPublicaciones);
router.get('/:id', verificarToken, pubController.obtenerPublicacion);
router.post('/',   verificarToken, pubController.crearPublicacion);
router.put('/:id', verificarToken, pubController.actualizarPublicacion);
router.delete('/:id', verificarToken, pubController.eliminarPublicacion);

router.post('/:id/like',        verificarToken, interController.toggleLike);
router.get('/:id/comentarios',  verificarToken, interController.listarComentarios);
router.post('/:id/comentarios', verificarToken, interController.agregarComentario);

module.exports = router;