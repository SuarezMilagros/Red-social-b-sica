// controllers/publicacionesController.js
// CRUD completo de publicaciones.

const db = require('../db/index');

// ------------------------------------------------------------------
// GET /api/publicaciones — Listar todas
// ------------------------------------------------------------------
async function listarPublicaciones(req, res) {
    try {
        const publicaciones = await db.query(
            `SELECT
                p.id,
                p.contenido,
                p.total_likes,
                p.fecha_creacion,
                u.id       AS autor_id,
                u.nombre   AS autor_nombre,
                u.username AS autor_username,
                (SELECT COUNT(*) FROM comentarios c WHERE c.id_publicacion = p.id) AS total_comentarios
             FROM publicaciones p
             JOIN usuarios u ON u.id = p.id_usuario
             ORDER BY p.fecha_creacion DESC`,
            []
        );

        return res.status(200).json({
            total:         publicaciones.length,
            publicaciones: publicaciones
        });

    } catch (error) {
        console.error('Error en listarPublicaciones:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}

// ------------------------------------------------------------------
// GET /api/publicaciones/:id — Obtener una por ID
// ------------------------------------------------------------------
async function obtenerPublicacion(req, res) {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
        return res.status(400).json({ error: 'El ID debe ser un número entero.' });
    }

    try {
        const publicaciones = await db.query(
            `SELECT
                p.id,
                p.contenido,
                p.total_likes,
                p.fecha_creacion,
                u.id       AS autor_id,
                u.nombre   AS autor_nombre,
                u.username AS autor_username
             FROM publicaciones p
             JOIN usuarios u ON u.id = p.id_usuario
             WHERE p.id = ?`,
            [id]
        );

        if (publicaciones.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada.' });
        }

        const comentarios = await db.query(
            `SELECT
                c.id,
                c.contenido,
                c.fecha_creacion,
                u.id       AS autor_id,
                u.nombre   AS autor_nombre,
                u.username AS autor_username
             FROM comentarios c
             JOIN usuarios u ON u.id = c.id_usuario
             WHERE c.id_publicacion = ?
             ORDER BY c.fecha_creacion ASC`,
            [id]
        );

        const publicacion       = publicaciones[0];
        publicacion.comentarios = comentarios;

        return res.status(200).json({ publicacion });

    } catch (error) {
        console.error('Error en obtenerPublicacion:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}

// ------------------------------------------------------------------
// POST /api/publicaciones — Crear nueva (usa el Stored Procedure)
//
// En lugar de hacer el INSERT directo, llamamos al stored procedure
// "registrar_publicacion" que vive en la base de datos.
// El procedure hace las validaciones y el INSERT por nosotros.
// Si algo falla, lanza un error que atrapamos en el catch.
// ------------------------------------------------------------------
async function crearPublicacion(req, res) {
    const { contenido } = req.body;
    const idUsuario     = req.usuario.id;

    if (!contenido || contenido.trim() === '') {
        return res.status(400).json({ error: 'El contenido no puede estar vacío.' });
    }

    try {
        // CALL es la forma de ejecutar un stored procedure en MySQL
        await db.query(
            'CALL registrar_publicacion(?, ?)',
            [idUsuario, contenido.trim()]
        );

        // Recuperar la publicación recién creada para devolverla en la response
        const publicaciones = await db.query(
            `SELECT p.id, p.contenido, p.total_likes, p.fecha_creacion,
                    u.nombre AS autor_nombre, u.username AS autor_username
             FROM publicaciones p
             JOIN usuarios u ON u.id = p.id_usuario
             WHERE p.id_usuario = ?
             ORDER BY p.fecha_creacion DESC
             LIMIT 1`,
            [idUsuario]
        );

        return res.status(201).json({
            mensaje:     'Publicación creada correctamente.',
            publicacion: publicaciones[0]
        });

    } catch (error) {
        console.error('Error en crearPublicacion:', error.message);
        if (error.sqlMessage) {
            return res.status(400).json({ error: error.sqlMessage });
        }
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}

// ------------------------------------------------------------------
// PUT /api/publicaciones/:id — Editar (usa Transacción)
//
// Una transacción agrupa operaciones SQL para que sean atómicas:
// o todas se ejecutan, o ninguna.
// Acá primero verificamos permisos y después hacemos el UPDATE.
// Si cualquier cosa falla en el medio, el rollback revierte todo.
// ------------------------------------------------------------------
async function actualizarPublicacion(req, res) {
    const id            = parseInt(req.params.id, 10);
    const { contenido } = req.body;
    const idUsuario     = req.usuario.id;

    if (isNaN(id)) {
        return res.status(400).json({ error: 'El ID debe ser un número entero.' });
    }

    if (!contenido || contenido.trim() === '') {
        return res.status(400).json({ error: 'El contenido no puede estar vacío.' });
    }

    // Pedimos una conexión dedicada del pool para la transacción.
    // La transacción TIENE que correr en la misma conexión de principio a fin.
    const conexion = await db.obtenerConexion();

    try {
        // Iniciamos la transacción
        await conexion.beginTransaction();

        // Verificar que la publicación existe
        const [publicaciones] = await conexion.execute(
            'SELECT id, id_usuario FROM publicaciones WHERE id = ?',
            [id]
        );

        if (publicaciones.length === 0) {
            await conexion.rollback();
            return res.status(404).json({ error: 'Publicación no encontrada.' });
        }

        const publicacion = publicaciones[0];

        // Verificar que el usuario tiene permiso para editar
        if (publicacion.id_usuario !== idUsuario && req.usuario.rol !== 'admin') {
            await conexion.rollback();
            return res.status(403).json({ error: 'No tenés permiso para editar esta publicación.' });
        }

        // Ejecutar el UPDATE dentro de la transacción
        await conexion.execute(
            'UPDATE publicaciones SET contenido = ? WHERE id = ?',
            [contenido.trim(), id]
        );

        // Todo bien: confirmar los cambios definitivamente
        await conexion.commit();

        return res.status(200).json({
            mensaje:     'Publicación actualizada correctamente.',
            publicacion: { id: id, contenido: contenido.trim() }
        });

    } catch (error) {
        // Algo falló: revertir TODOS los cambios
        await conexion.rollback();
        console.error('Error en actualizarPublicacion (ROLLBACK ejecutado):', error.message);
        return res.status(500).json({ error: 'Error interno. Los cambios fueron revertidos.' });

    } finally {
        // Siempre liberar la conexión de vuelta al pool
        // El finally se ejecuta SIEMPRE, haya error o no
        conexion.release();
    }
}

// ------------------------------------------------------------------
// DELETE /api/publicaciones/:id — Eliminar
// ------------------------------------------------------------------
async function eliminarPublicacion(req, res) {
    const id        = parseInt(req.params.id, 10);
    const idUsuario = req.usuario.id;

    if (isNaN(id)) {
        return res.status(400).json({ error: 'El ID debe ser un número entero.' });
    }

    try {
        const publicaciones = await db.query(
            'SELECT id, id_usuario FROM publicaciones WHERE id = ?',
            [id]
        );

        if (publicaciones.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada.' });
        }

        const publicacion = publicaciones[0];

        if (publicacion.id_usuario !== idUsuario && req.usuario.rol !== 'admin') {
            return res.status(403).json({ error: 'No tenés permiso para eliminar esta publicación.' });
        }

        await db.query('DELETE FROM publicaciones WHERE id = ?', [id]);

        return res.status(200).json({ mensaje: 'Publicación eliminada correctamente.' });

    } catch (error) {
        console.error('Error en eliminarPublicacion:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}

module.exports = {
    listarPublicaciones,
    obtenerPublicacion,
    crearPublicacion,
    actualizarPublicacion,
    eliminarPublicacion
};