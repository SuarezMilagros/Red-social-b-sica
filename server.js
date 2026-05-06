// server.js
// Es el punto de entrada de toda la aplicación.
// Acá configuramos Express, los middlewares globales y montamos las rutas.

// require('dotenv').config() TIENE que ser la primera línea.
// Carga las variables del .env y las pone disponibles en process.env
require('dotenv').config();

const express    = require('express');
const path       = require('path');
const routesAuth = require('./routes/auth');
const routesPub  = require('./routes/publicaciones');
const routesCom  = require('./routes/comentarios');

const app  = express();
const PORT = process.env.PORT || 3000;

// -------------------------------------------------------
// Middlewares globales
// Son funciones que se ejecutan en CADA request antes de
// llegar al controller. Se configuran con app.use()
// -------------------------------------------------------

// Le dice a Express que el body de las requests puede ser JSON
// Sin esto, req.body vendría undefined
app.use(express.json());

// Para leer formularios URL-encoded (no lo usamos mucho pero no molesta tenerlo)
app.use(express.urlencoded({ extended: true }));

// Sirve los archivos de la carpeta /public como archivos estáticos.
// Cuando el navegador pida http://localhost:3000, Express devuelve public/index.html
// Cuando pida http://localhost:3000/style.css, devuelve public/style.css
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------
// Rutas de la API
// Cada router maneja un grupo de endpoints
// -------------------------------------------------------
app.use('/api/auth',          routesAuth);
app.use('/api/publicaciones', routesPub);
app.use('/api/comentarios',   routesCom);

// -------------------------------------------------------
// Fallback para el frontend
// Si alguien va a cualquier ruta que no sea /api/...,
// le devolvemos el index.html para que el frontend se encargue
// -------------------------------------------------------
app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------------------------------------------
// Iniciar el servidor
// -------------------------------------------------------
app.listen(PORT, function() {
    console.log('================================================');
    console.log('  TP3 - Red Social');
    console.log('  Servidor en: http://localhost:' + PORT);
    console.log('================================================');
});