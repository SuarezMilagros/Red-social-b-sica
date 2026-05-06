// controllers/authController.js
// Maneja el registro y login de usuarios.

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../db/index');

// ------------------------------------------------------------------
// POST /api/auth/register
// ------------------------------------------------------------------
async function register(req, res) {
    const { nombre, username, email, password } = req.body;

    if (!nombre || !username || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    try {
        // Verificar que el email o username no estén tomados
        const usuariosExistentes = await db.query(
            'SELECT id FROM usuarios WHERE email = ? OR username = ?',
            [email, username]
        );

        if (usuariosExistentes.length > 0) {
            return res.status(409).json({ error: 'El email o el username ya están registrados.' });
        }

        // Hashear la contraseña antes de guardarla
        // NUNCA se guarda la contraseña en texto plano
        // bcrypt.genSalt(10) genera un "salt" aleatorio con 10 rondas de encriptación
        // bcrypt.hash() combina el salt con la contraseña y devuelve el hash
        const salt         = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insertar el usuario en la BD
        // En MySQL el resultado del INSERT tiene insertId con el ID generado
        const resultado = await db.query(
            'INSERT INTO usuarios (nombre, username, email, password_hash) VALUES (?, ?, ?, ?)',
            [nombre, username, email, passwordHash]
        );

        return res.status(201).json({
            mensaje: 'Usuario registrado correctamente.',
            usuario: {
                id:       resultado.insertId,
                nombre:   nombre,
                username: username,
                email:    email
            }
        });

    } catch (error) {
        console.error('Error en register:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}

// ------------------------------------------------------------------
// POST /api/auth/login
// ------------------------------------------------------------------
async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y password son obligatorios.' });
    }

    try {
        const usuarios = await db.query(
            'SELECT id, nombre, username, email, password_hash, rol FROM usuarios WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            // No aclaramos si el email no existe o la contraseña está mal
            // (por seguridad, para no darle info al atacante)
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }

        const usuario = usuarios[0];

        // bcrypt.compare compara la contraseña en texto plano con el hash guardado
        // Devuelve true si coinciden, false si no
        const passwordEsValida = await bcrypt.compare(password, usuario.password_hash);

        if (!passwordEsValida) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }

        // Armar el payload: los datos que van DENTRO del token
        // No pongas info sensible acá (contraseñas, tarjetas, etc.)
        const payload = {
            id:       usuario.id,
            nombre:   usuario.nombre,
            username: usuario.username,
            email:    usuario.email,
            rol:      usuario.rol
        };

        // Firmar el token con la clave secreta del .env
        // El token expira según JWT_EXPIRES_IN del .env (ej: "24h")
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        });

        return res.status(200).json({
            mensaje: 'Login exitoso.',
            token:   token,
            usuario: {
                id:       usuario.id,
                nombre:   usuario.nombre,
                username: usuario.username,
                email:    usuario.email,
                rol:      usuario.rol
            }
        });

    } catch (error) {
        console.error('Error en login:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}

module.exports = { register, login };