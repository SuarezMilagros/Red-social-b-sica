// middleware/auth.js
// Este middleware protege las rutas que requieren estar logueado.
// Se ejecuta ANTES del controller en las rutas que lo usen.
//
// Flujo:
// Request llega → middleware verifica token → si OK pasa al controller
//                                           → si falla responde 401

const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
    // El cliente tiene que mandar el header así:
    // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token.' });
    }

    // Separamos "Bearer" del token real
    const partes = authHeader.split(' ');

    if (partes.length !== 2 || partes[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Formato inválido. Usar: Authorization: Bearer <token>' });
    }

    const token = partes[1];

    try {
        // jwt.verify hace dos cosas:
        // 1. Verifica que la firma sea válida (que el token no fue modificado)
        // 2. Verifica que no haya expirado
        // Si algo falla, lanza una excepción que atrapa el catch
        const datosDecodificados = jwt.verify(token, process.env.JWT_SECRET);

        // Guardamos los datos del usuario en el request.
        // Así en el controller podemos acceder a req.usuario.id, req.usuario.rol, etc.
        req.usuario = datosDecodificados;

        // Todo bien, pasamos al siguiente middleware o al controller
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
}

module.exports = { verificarToken };