# nodo. — Red Social

**TP3 – App Web con Node.js + MySQL**
Programación III | Tecnicatura en Programación

Aplicación web full-stack de red social básica. Permite registrarse, iniciar sesión, publicar contenido, comentar publicaciones y dar likes. Construida con Node.js, Express, MySQL y un frontend en HTML5, CSS3 y JavaScript Vanilla.

---

## Tecnologías utilizadas

- **Backend:** Node.js + Express
- **Base de datos:** MySQL (administrada con phpMyAdmin / XAMPP)
- **Autenticación:** JWT (JSON Web Tokens) + bcryptjs
- **Frontend:** HTML5 semántico + CSS3 + JavaScript Vanilla

---

## Instrucciones de instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/tp3-redsocial.git
cd tp3-redsocial
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear la base de datos

- Abrir XAMPP y darle **Start** a MySQL
- Ir a `http://localhost/phpmyadmin`
- Crear una base de datos llamada `redsocial_db`
- Seleccionarla, ir a la pestaña **SQL**, pegar el contenido de `database.sql` y ejecutar

### 4. Configurar el archivo .env

Copiar el archivo de ejemplo y completarlo con los datos reales:

```bash
cp .env.example .env
```

Editar el archivo `.env` con los valores correspondientes:

```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=redsocial_db
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
JWT_SECRET=una_clave_larga_y_secreta
JWT_EXPIRES_IN=24h
```

> ⚠️ El archivo `.env` **nunca debe subirse al repositorio**. Está incluido en `.gitignore`. Subir el `.env` a un repositorio público o privado resulta en el TP desaprobado.

### 5. Iniciar el servidor

```bash
# Modo desarrollo (reinicia automáticamente al guardar cambios)
npm run dev

# Modo producción
npm start
```

Abrir el navegador en: **http://localhost:3000**

---

## Estructura del proyecto

```
tp3-redsocial/
├── server.js                       # Punto de entrada
├── .env                            # Variables de entorno (NO subir)
├── .env.example                    # Ejemplo de variables (sí subir)
├── .gitignore                      # Archivos ignorados por Git
├── database.sql                    # Script completo de la base de datos
├── db/
│   └── index.js                    # Pool de conexiones MySQL
├── controllers/
│   ├── authController.js           # Registro y login
│   ├── publicacionesController.js  # CRUD de publicaciones
│   └── interaccionesController.js  # Likes y comentarios
├── routes/
│   ├── auth.js                     # /api/auth/*
│   ├── publicaciones.js            # /api/publicaciones/*
│   └── comentarios.js              # /api/comentarios/*
├── middleware/
│   └── auth.js                     # Verificación JWT
└── public/
    ├── index.html                  # Frontend (HTML5 semántico)
    ├── style.css                   # Estilos (CSS3)
    └── app.js                      # Lógica del frontend (JS Vanilla)
```

---

## Endpoints de la API

| Método | Ruta | Descripción | Requiere JWT |
|--------|------|-------------|-------------|
| POST | `/api/auth/register` | Registrar usuario | No |
| POST | `/api/auth/login` | Login, devuelve JWT | No |
| GET | `/api/publicaciones` | Listar publicaciones | Sí |
| GET | `/api/publicaciones/:id` | Ver una publicación | Sí |
| POST | `/api/publicaciones` | Crear publicación | Sí |
| PUT | `/api/publicaciones/:id` | Editar publicación | Sí |
| DELETE | `/api/publicaciones/:id` | Eliminar publicación | Sí |
| POST | `/api/publicaciones/:id/like` | Toggle like | Sí |
| GET | `/api/publicaciones/:id/comentarios` | Ver comentarios | Sí |
| POST | `/api/publicaciones/:id/comentarios` | Agregar comentario | Sí |
| DELETE | `/api/comentarios/:id` | Eliminar comentario | Sí |

---

## Explicación del Procedimiento Almacenado, Trigger y Transacción

### Procedimiento Almacenado: `registrar_publicacion`

El procedimiento `registrar_publicacion` recibe dos parámetros: el ID del usuario y el contenido de la publicación. Antes de insertar el registro, realiza dos validaciones directamente en la base de datos: verifica que el usuario exista en la tabla `usuarios` y que el contenido no esté vacío. Si alguna de las dos condiciones falla, lanza un error con `SIGNAL SQLSTATE '45000'` que llega al backend como una excepción y se devuelve al cliente con un mensaje descriptivo. Si todo está bien, ejecuta el `INSERT` en la tabla `publicaciones`. Se llama desde Node.js con `CALL registrar_publicacion(?, ?)`.

### Triggers: `trg_sumar_like` y `trg_restar_like`

Se implementaron dos triggers sobre la tabla `likes`. El trigger `trg_sumar_like` se dispara automáticamente después de cada `INSERT` en `likes`: toma el `id_publicacion` del nuevo registro (`NEW.id_publicacion`) y ejecuta un `UPDATE` en la tabla `publicaciones` sumando 1 al campo `total_likes`. El trigger `trg_restar_like` hace lo opuesto: se dispara después de cada `DELETE` en `likes` y resta 1 al contador usando `OLD.id_publicacion`. De esta forma, el contador siempre está sincronizado sin necesidad de lógica extra en el backend.

Además se implementó el trigger `trg_log_nuevo_usuario` que se dispara después de cada `INSERT` en `usuarios` y registra la acción en la tabla `log_actividad` usando `CONCAT` para armar un mensaje con el username y el email del nuevo usuario.

### Transacción con ROLLBACK: editar publicación

En el endpoint `PUT /api/publicaciones/:id` se utiliza una transacción manual. Se obtiene una conexión dedicada del pool y se ejecuta `beginTransaction()`. Primero se verifica que la publicación exista y que pertenezca al usuario autenticado. Si cualquiera de esas verificaciones falla, se llama a `rollback()` antes de responder con error, asegurando que no quede ningún cambio parcial. Solo si todo es correcto se ejecuta el `UPDATE` y se confirma con `commit()`. Si ocurre cualquier error inesperado en el bloque `try`, el `catch` ejecuta `rollback()` automáticamente. La conexión siempre se libera al pool en el bloque `finally`.

---

## Preguntas Conceptuales

### 1. ¿Qué es un servidor web y cómo funciona el ciclo request-response?

Un servidor web es un programa que escucha conexiones entrantes en un puerto de red. Cuando un cliente (el navegador) quiere algo, envía una **request** HTTP con un método (GET, POST, etc.), una URL y opcionalmente un cuerpo con datos. El servidor la recibe, la procesa (consulta la base de datos, ejecuta lógica de negocio, etc.) y devuelve una **response** con un código de estado (200 para éxito, 404 para no encontrado, 401 para no autorizado, etc.) y un cuerpo (JSON, HTML, etc.). El ciclo termina ahí: HTTP es sin estado, cada request es completamente independiente de las anteriores.

### 2. ¿Qué es Express y por qué lo usamos en lugar de usar solo Node.js?

Express es un framework minimalista para Node.js que simplifica la creación de servidores HTTP. Con Node.js puro se puede hacer un servidor, pero hay que parsear manualmente la URL, el método, el cuerpo del request y gestionar el enrutamiento a mano, lo que genera mucho código repetitivo y propenso a errores. Express abstrae todo eso: permite definir rutas con `router.get()`, `router.post()`, etc., parsear el body automáticamente con `express.json()`, y encadenar middlewares de forma ordenada. El resultado es código más legible, organizado por capas y fácil de mantener sin perder flexibilidad.

### 3. ¿Qué es un JWT y cómo se diferencia de guardar la sesión en el servidor?

Un JWT (JSON Web Token) es un token firmado digitalmente que contiene los datos del usuario codificados en su payload. El servidor lo genera al hacer login y lo envía al cliente, que lo guarda (en `localStorage` en este caso). En cada request protegida, el cliente lo manda en el header y el servidor solo verifica la firma criptográfica usando su clave secreta, sin consultar ninguna base de datos. La diferencia con las sesiones tradicionales es que éstas guardan el estado en el servidor (en memoria o en una BD), lo que complica el escalado horizontal porque todos los servidores deben compartir ese estado. JWT es **stateless**: cualquier instancia del servidor puede verificar un token sin conocer las demás.

### 4. ¿Qué ventaja tiene usar un procedimiento almacenado en lugar de escribir ese SQL desde Node.js?

Usar un stored procedure encapsula la lógica de negocio directamente en la base de datos, cerca de los datos. Las ventajas principales son: la lógica de validación no puede ser saltada por ningún cliente que se conecte directamente a la BD; se reduce el tráfico de red porque se envía una sola llamada `CALL` en lugar de múltiples queries separadas; la base de datos puede precompilar y optimizar el plan de ejecución del procedure; y distintas aplicaciones o microservicios pueden reutilizarlo sin duplicar código. También hace que el código del backend sea más limpio porque delega responsabilidades a la capa de datos.

### 5. ¿Por qué es importante usar transacciones? Ejemplo con ROLLBACK.

Las transacciones garantizan **atomicidad**: un conjunto de operaciones se ejecuta como una unidad, o todas tienen éxito o ninguna se aplica. Esto protege la integridad de los datos ante fallos parciales.

**Ejemplo con ROLLBACK:** en una transferencia bancaria, el proceso implica dos operaciones: restarle saldo a la cuenta origen y sumarle saldo a la cuenta destino. Si el servidor falla después de ejecutar el primer `UPDATE` pero antes del segundo, sin transacción el dinero desaparece del origen pero nunca llega al destino. Con una transacción, el `ROLLBACK` revierte el primer `UPDATE` automáticamente y los saldos quedan intactos.

En este TP se aplica en la edición de publicaciones: si la verificación de permisos o el `UPDATE` fallan por cualquier motivo, el `ROLLBACK` evita que quede un estado inconsistente en la base de datos.

### 6. ¿Qué es un trigger? Describe el trigger que implementaste y en qué momento se dispara.

Un trigger es una función almacenada en la base de datos que se ejecuta **automáticamente** cuando ocurre un evento específico (INSERT, UPDATE o DELETE) sobre una tabla determinada, sin que la aplicación lo invoque explícitamente.

En este TP se implementaron tres triggers. El `trg_sumar_like` se dispara **después de cada INSERT en la tabla `likes`**: toma el `id_publicacion` del nuevo registro y suma 1 al campo `total_likes` en la tabla `publicaciones`. El `trg_restar_like` se dispara **después de cada DELETE en `likes`** y resta 1 al mismo contador. Así el total siempre está actualizado sin necesidad de lógica extra en Node.js. El tercer trigger, `trg_log_nuevo_usuario`, se dispara **después de cada INSERT en `usuarios`** y registra la acción en la tabla `log_actividad`.