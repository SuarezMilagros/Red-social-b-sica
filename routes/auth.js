// routes/auth.js
// Define qué función del controller se ejecuta para cada URL de auth.
// Estas rutas NO requieren token JWT.

const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login',    authController.login);

module.exports = router;