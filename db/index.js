// db/index.js
// Este archivo maneja la conexión a MySQL.
// Usamos un "pool" de conexiones, que es un conjunto de conexiones
// abiertas y listas para usar. Así no abrimos y cerramos una conexión
// nueva por cada consulta, lo cual sería muy lento.

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
});

// Cuando el servidor arranca, intentamos conectarnos para
// verificar que los datos del .env son correctos.
async function verificarConexion() {
    try {
        const conexion = await pool.getConnection();
        console.log('Conexión a MySQL establecida correctamente.');
        conexion.release();
    } catch (error) {
        console.error('Error al conectar con MySQL:', error.message);
        console.error('Verificá que XAMPP esté corriendo y los datos del .env sean correctos.');
    }
}

verificarConexion();

// Función para ejecutar queries simples.
// Nota importante: MySQL usa ? como placeholder, no $1, $2 como PostgreSQL.
// Ejemplo: db.query('SELECT * FROM usuarios WHERE email = ?', [email])
async function query(sql, params) {
    const [filas] = await pool.execute(sql, params);
    return filas;
}

// Función para obtener una conexión individual del pool.
// La necesitamos cuando queremos manejar transacciones manualmente
// (BEGIN / COMMIT / ROLLBACK), porque la transacción tiene que
// correr toda en la misma conexión.
async function obtenerConexion() {
    const conexion = await pool.getConnection();
    return conexion;
}

module.exports = { query, obtenerConexion };