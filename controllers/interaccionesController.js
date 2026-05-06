// controllers/interaccionesController.js
// Likes y comentarios.

const db = require('../db/index');

// ------------------------------------------------------------------
// POST /api/publicaciones/:id/like — Toggle like
//
// Si el usuario ya le dio like → lo quitamos (DELETE)
// Si no le había dado like → lo agregamos (INSERT)
// Los triggers de MySQL actualizan total_likes automáticamente.
// ------------------------------------------------------------------
async function toggleLike(req, res) {
    const idPublicacion = parseInt(req.params.id, 10);
    const idUsuario     = req.usuario.id;

    if (isNaN(idPublicacion)) {
        return res.status(400).json({ error: 'El ID debe ser un número entero.' });
    }

    try {
        const publicaciones = await db.query(
            'SELECT id FROM publicaciones WHERE id = ?',
            [idPublicacion]
        );

        if (publicaciones.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada.' });
        }

        const likesExistentes = await db.query(
            'SELECT id FROM likes WHERE id_publicacion = ? AND id_usuario = ?',
            [idPublicacion, idUsuario]
        );

        let mensaje = '';
        let accion  = '';

        if (likesExistentes.length > 0) {
            // Ya tiene like → quitar. El trigger trg_restar_like se dispara solo.
            await db.query(
                'DELETE FROM likes WHERE id_publicacion = ? AND id_usuario = ?',
                [idPublicacion, idUsuario]
            );
            mensaje = 'Like quitado.';
            accion  = 'quitado';
        } else {
            // No tiene like → dar. El trigger trg_sumar_like se dispara solo.
            await db.query(
                'INSERT INTO likes (id_publicacion, id_usuario) VALUES (?, ?)',
                [idPublicacion, idUsuario]
            );
            mensaje = 'Like agregado.';
            accion  = 'agregado';
        }

        // Leer el total_likes actualizado (el trigger ya lo modificó en la BD)
        const publicacionActualizada = await db.query(
            'SELECT total_likes FROM publicaciones WHERE id = ?',
            [idPublicacion]
        );

        return res.status(200).json({
            mensaje:     mensaje,
            accion:      accion,
            total_likes: publicacionActualizada[0].total_likes
        });

    } catch (error) {
        console.error('Error en toggleLike:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}

// ------------------------------------------------------------------
// GET /api/publicaciones/:id/comentarios
// ------------------------------------------------------------------
async function listarComentarios(req, res) {
    const idPublicacion = parseInt(req.params.id, 10);

    if (isNaN(idPublicacion)) {
        return res.status(400).json({ error: 'El ID debe ser un número entero.' });
    }

    try {
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
            [idPublicacion]
        );

        return res.status(200).json({
            total:       comentarios.length,
            comentarios: comentarios
        });

    } catch (error) {
        console.error('Error en listarComentarios:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}

// ------------------------------------------------------------------
// POST /api/publicaciones/:id/comentarios
// ------------------------------------------------------------------
async function agregarComentario(req, res) {
    const idPublicacion = parseInt(req.params.id, 10);
    const idUsuario     = req.usuario.id;
    const { contenido } = req.body;

    if (isNaN(idPublicacion)) {
        return res.status(400).json({ error: 'El ID debe ser un número entero.' });
    }

    if (!contenido || contenido.trim() === '') {
        return res.status(400).json({ error: 'El contenido no puede estar vacío.' });
    }

    try {
        const publicaciones = await db.query(
            'SELECT id FROM publicaciones WHERE id = ?',
            [idPublicacion]
        );

        if (publicaciones.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada.' });
        }

        const resultado = await db.query(
            'INSERT INTO comentarios (id_publicacion, id_usuario, contenido) VALUES (?, ?, ?)',
            [idPublicacion, idUsuario, contenido.trim()]
        );

        return res.status(201).json({
            mensaje: 'Comentario agregado.',
            comentario: {
                id:             resultado.insertId,
                contenido:      contenido.trim(),
                fecha_creacion: new Date(),
                autor_id:       idUsuario,
                autor_nombre:   req.usuario.nombre,
                autor_username: req.usuario.username
            }
        });

    } catch (error) {
        console.error('Error en agregarComentario:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}

// ------------------------------------------------------------------
// DELETE /api/comentarios/:id
// ------------------------------------------------------------------
async function eliminarComentario(req, res) {
    const id        = parseInt(req.params.id, 10);
    const idUsuario = req.usuario.id;

    if (isNaN(id)) {
        return res.status(400).json({ error: 'El ID debe ser un número entero.' });
    }

    try {
        const comentarios = await db.query(
            'SELECT id, id_usuario FROM comentarios WHERE id = ?',
            [id]
        );

        if (comentarios.length === 0) {
            return res.status(404).json({ error: 'Comentario no encontrado.' });
        }

        const comentario = comentarios[0];

        if (comentario.id_usuario !== idUsuario && req.usuario.rol !== 'admin') {
            return res.status(403).json({ error: 'No tenés permiso para eliminar este comentario.' });
        }

        await db.query('DELETE FROM comentarios WHERE id = ?', [id]);

        return res.status(200).json({ mensaje: 'Comentario eliminado.' });

    } catch (error) {
        console.error('Error en eliminarComentario:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}

module.exports = {
    toggleLike,
    listarComentarios,
    agregarComentario,
    eliminarComentario
};