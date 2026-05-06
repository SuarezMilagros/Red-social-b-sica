// app.js
// JavaScript Vanilla puro.
// IMPORTANTE: No se usan atributos onclick en el HTML.
// Todos los eventos se registran con addEventListener() desde acá.
// Esto separa la lógica del markup (HTML semántico + JS desacoplado).

// ============================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ============================================================

var estadoApp = {
    token:             null,   // JWT guardado en localStorage
    usuario:           null,   // datos del usuario logueado
    publicacionActual: null    // ID de la pub abierta en el modal
};

// ============================================================
// PUNTO DE ENTRADA — se ejecuta cuando el DOM está listo
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarApp();
});

function inicializarApp() {
    // 1. Verificar si ya hay sesión activa
    var tokenGuardado   = localStorage.getItem('token');
    var usuarioGuardado = localStorage.getItem('usuario');

    if (tokenGuardado && usuarioGuardado) {
        estadoApp.token   = tokenGuardado;
        estadoApp.usuario = JSON.parse(usuarioGuardado);
        mostrarPantallaApp();
    } else {
        mostrarPantallaAuth();
    }

    // 2. Registrar TODOS los event listeners
    registrarEventosAuth();
    registrarEventosApp();
    registrarEventosModal();
}

// ============================================================
// REGISTRO DE EVENTOS DE AUTENTICACIÓN
// ============================================================

function registrarEventosAuth() {
    // Tabs de login / registro
    var tabLogin    = document.getElementById('tab-login');
    var tabRegistro = document.getElementById('tab-registro');

    tabLogin.addEventListener('click', function() {
        mostrarPanelLogin();
    });

    tabRegistro.addEventListener('click', function() {
        mostrarPanelRegistro();
    });

    // Submit del formulario de login
    var formLogin = document.getElementById('form-login');
    formLogin.addEventListener('submit', function(evento) {
        evento.preventDefault();
        handleLogin();
    });

    // Submit del formulario de registro
    var formRegistro = document.getElementById('form-registro');
    formRegistro.addEventListener('submit', function(evento) {
        evento.preventDefault();
        handleRegistro();
    });
}

// ============================================================
// REGISTRO DE EVENTOS DE LA APP PRINCIPAL
// ============================================================

function registrarEventosApp() {
    // Botón de logout
    var btnLogout = document.getElementById('btn-logout');
    btnLogout.addEventListener('click', function() {
        handleLogout();
    });

    // Botón de actualizar feed
    var btnRefresh = document.getElementById('btn-refresh');
    btnRefresh.addEventListener('click', function() {
        cargarPublicaciones();
    });

    // Submit de nueva publicación
    var formNuevaPub = document.getElementById('form-nueva-pub');
    formNuevaPub.addEventListener('submit', function(evento) {
        evento.preventDefault();
        handleNuevaPublicacion();
    });

    // Contador de caracteres del textarea
    var textarea = document.getElementById('nueva-pub-contenido');
    textarea.addEventListener('input', function() {
        var largo   = textarea.value.length;
        var contador = document.getElementById('char-count');
        contador.textContent = largo + ' / 500';
    });
}

// ============================================================
// REGISTRO DE EVENTOS DEL MODAL
// ============================================================

function registrarEventosModal() {
    // Botón cerrar modal
    var btnCerrar = document.getElementById('btn-cerrar-modal');
    btnCerrar.addEventListener('click', function() {
        cerrarModal();
    });

    // Cerrar modal haciendo click en el backdrop (fuera del contenido)
    var modal = document.getElementById('modal-pub');
    modal.addEventListener('click', function(evento) {
        // El <dialog> nativo: si el click fue directamente en el dialog
        // (el backdrop) y no en su contenido interior, cerramos
        if (evento.target === modal) {
            cerrarModal();
        }
    });

    // Cerrar modal con tecla Escape (el <dialog> nativo lo hace solo,
    // pero lo manejamos para que también actualice nuestro estado)
    modal.addEventListener('cancel', function(evento) {
        evento.preventDefault();
        cerrarModal();
    });

    // Submit del formulario de comentario
    var formComentario = document.getElementById('form-comentario');
    formComentario.addEventListener('submit', function(evento) {
        evento.preventDefault();
        handleNuevoComentario();
    });
}

// ============================================================
// NAVEGACIÓN ENTRE PANTALLAS
// ============================================================

function mostrarPantallaAuth() {
    var pantallaAuth = document.getElementById('pantalla-auth');
    var pantallaApp  = document.getElementById('pantalla-app');

    pantallaAuth.classList.remove('oculto');
    pantallaApp.classList.add('oculto');
}

function mostrarPantallaApp() {
    var pantallaAuth = document.getElementById('pantalla-auth');
    var pantallaApp  = document.getElementById('pantalla-app');

    pantallaAuth.classList.add('oculto');
    pantallaApp.classList.remove('oculto');

    // Llenar los datos del perfil
    var usuario = estadoApp.usuario;

    document.getElementById('nav-username').textContent          = '@' + usuario.username;
    document.getElementById('perfil-nombre').textContent         = usuario.nombre;
    document.getElementById('perfil-username-display').textContent = '@' + usuario.username;
    document.getElementById('perfil-avatar-letra').textContent   = usuario.nombre.charAt(0).toUpperCase();

    cargarPublicaciones();
}

// ============================================================
// TABS DE AUTH
// ============================================================

function mostrarPanelLogin() {
    var panelLogin    = document.getElementById('panel-login');
    var panelRegistro = document.getElementById('panel-registro');
    var tabLogin      = document.getElementById('tab-login');
    var tabRegistro   = document.getElementById('tab-registro');

    panelLogin.classList.remove('oculto');
    panelRegistro.classList.add('oculto');

    tabLogin.classList.add('tab-activo');
    tabRegistro.classList.remove('tab-activo');

    tabLogin.setAttribute('aria-selected', 'true');
    tabRegistro.setAttribute('aria-selected', 'false');

    limpiarMensajes();
}

function mostrarPanelRegistro() {
    var panelLogin    = document.getElementById('panel-login');
    var panelRegistro = document.getElementById('panel-registro');
    var tabLogin      = document.getElementById('tab-login');
    var tabRegistro   = document.getElementById('tab-registro');

    panelLogin.classList.add('oculto');
    panelRegistro.classList.remove('oculto');

    tabLogin.classList.remove('tab-activo');
    tabRegistro.classList.add('tab-activo');

    tabLogin.setAttribute('aria-selected', 'false');
    tabRegistro.setAttribute('aria-selected', 'true');

    limpiarMensajes();
}

function limpiarMensajes() {
    var errorLogin    = document.getElementById('error-login');
    var errorRegistro = document.getElementById('error-registro');
    var exitoRegistro = document.getElementById('exito-registro');

    errorLogin.classList.add('oculto');
    errorRegistro.classList.add('oculto');
    exitoRegistro.classList.add('oculto');
}

// ============================================================
// AUTH: LOGIN
// ============================================================

async function handleLogin() {
    var email     = document.getElementById('login-email').value.trim();
    var password  = document.getElementById('login-password').value;
    var errorDiv  = document.getElementById('error-login');
    var btnSubmit = document.getElementById('btn-login-submit');

    errorDiv.classList.add('oculto');
    btnSubmit.disabled    = true;
    btnSubmit.textContent = 'Ingresando…';

    try {
        var respuesta = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email, password: password })
        });

        var datos = await respuesta.json();

        if (!respuesta.ok) {
            errorDiv.textContent = datos.error || 'Error al iniciar sesión.';
            errorDiv.classList.remove('oculto');
            return;
        }

        localStorage.setItem('token',   datos.token);
        localStorage.setItem('usuario', JSON.stringify(datos.usuario));

        estadoApp.token   = datos.token;
        estadoApp.usuario = datos.usuario;

        document.getElementById('form-login').reset();
        mostrarPantallaApp();

    } catch (error) {
        errorDiv.textContent = 'Error de conexión. Verificá que el servidor esté corriendo.';
        errorDiv.classList.remove('oculto');
    } finally {
        btnSubmit.disabled    = false;
        btnSubmit.textContent = 'Entrar';
    }
}

// ============================================================
// AUTH: REGISTRO
// ============================================================

async function handleRegistro() {
    var nombre    = document.getElementById('reg-nombre').value.trim();
    var username  = document.getElementById('reg-username').value.trim();
    var email     = document.getElementById('reg-email').value.trim();
    var password  = document.getElementById('reg-password').value;
    var errorDiv  = document.getElementById('error-registro');
    var exitoDiv  = document.getElementById('exito-registro');
    var btnSubmit = document.getElementById('btn-reg-submit');

    errorDiv.classList.add('oculto');
    exitoDiv.classList.add('oculto');

    if (password.length < 6) {
        errorDiv.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        errorDiv.classList.remove('oculto');
        return;
    }

    btnSubmit.disabled    = true;
    btnSubmit.textContent = 'Creando cuenta…';

    try {
        var respuesta = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre:   nombre,
                username: username,
                email:    email,
                password: password
            })
        });

        var datos = await respuesta.json();

        if (!respuesta.ok) {
            errorDiv.textContent = datos.error || 'Error al registrarse.';
            errorDiv.classList.remove('oculto');
            return;
        }

        exitoDiv.textContent = '¡Cuenta creada! Ya podés iniciar sesión.';
        exitoDiv.classList.remove('oculto');
        document.getElementById('form-registro').reset();

        setTimeout(function() {
            mostrarPanelLogin();
        }, 1500);

    } catch (error) {
        errorDiv.textContent = 'Error de conexión.';
        errorDiv.classList.remove('oculto');
    } finally {
        btnSubmit.disabled    = false;
        btnSubmit.textContent = 'Crear cuenta';
    }
}

// ============================================================
// AUTH: LOGOUT
// ============================================================

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    estadoApp.token   = null;
    estadoApp.usuario = null;
    mostrarPantallaAuth();
}

// ============================================================
// HELPERS DE FETCH CON JWT
// ============================================================

async function apiGet(url) {
    var respuesta = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + estadoApp.token,
            'Content-Type':  'application/json'
        }
    });
    return respuesta;
}

async function apiPost(url, cuerpo) {
    var respuesta = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + estadoApp.token,
            'Content-Type':  'application/json'
        },
        body: JSON.stringify(cuerpo)
    });
    return respuesta;
}

async function apiPut(url, cuerpo) {
    var respuesta = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': 'Bearer ' + estadoApp.token,
            'Content-Type':  'application/json'
        },
        body: JSON.stringify(cuerpo)
    });
    return respuesta;
}

async function apiDelete(url) {
    var respuesta = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + estadoApp.token,
            'Content-Type':  'application/json'
        }
    });
    return respuesta;
}

// ============================================================
// CARGAR PUBLICACIONES
// ============================================================

async function cargarPublicaciones() {
    var loadingDiv = document.getElementById('loading-feed');
    var listaDiv   = document.getElementById('lista-publicaciones');

    loadingDiv.classList.remove('oculto');
    listaDiv.innerHTML = '';

    try {
        var respuesta = await apiGet('/api/publicaciones');

        if (respuesta.status === 401) {
            handleLogout();
            return;
        }

        var datos = await respuesta.json();
        loadingDiv.classList.add('oculto');

        if (!respuesta.ok) {
            listaDiv.innerHTML = '<p class="sin-publicaciones">Error al cargar publicaciones.</p>';
            return;
        }

        if (datos.publicaciones.length === 0) {
            listaDiv.innerHTML = '<p class="sin-publicaciones">Todavía no hay publicaciones.</p>';
            return;
        }

        datos.publicaciones.forEach(function(pub) {
            var tarjeta = crearTarjetaPublicacion(pub);
            listaDiv.appendChild(tarjeta);
        });

    } catch (error) {
        loadingDiv.classList.add('oculto');
        listaDiv.innerHTML = '<p class="sin-publicaciones">Error de conexión.</p>';
    }
}

// ============================================================
// CREAR TARJETA DE PUBLICACIÓN CON addEventListener
// ============================================================

function crearTarjetaPublicacion(pub) {
    var esPropietario = (pub.autor_id === estadoApp.usuario.id);
    var esAdmin       = (estadoApp.usuario.rol === 'admin');

    var fecha = new Date(pub.fecha_creacion);
    var fechaFormateada = fecha.toLocaleDateString('es-AR', {
        day:   '2-digit',
        month: 'short',
        year:  'numeric'
    });

    // Contenedor principal — article es semántico para un post
    var article = document.createElement('article');
    article.className  = 'pub-card';
    article.dataset.id = pub.id;

    // --- HEADER ---
    var header = document.createElement('header');
    header.className = 'pub-card-header';

    var avatar = document.createElement('div');
    avatar.className        = 'pub-avatar';
    avatar.textContent      = pub.autor_nombre.charAt(0).toUpperCase();
    avatar.setAttribute('aria-hidden', 'true');

    var infoDiv = document.createElement('div');

    var nombreP = document.createElement('p');
    nombreP.className  = 'pub-autor-nombre';
    nombreP.textContent = pub.autor_nombre;

    var usernameP = document.createElement('p');
    usernameP.className  = 'pub-autor-username';
    usernameP.textContent = '@' + pub.autor_username;

    infoDiv.appendChild(nombreP);
    infoDiv.appendChild(usernameP);

    var fechaTime = document.createElement('time');
    fechaTime.className   = 'pub-fecha';
    fechaTime.textContent = fechaFormateada;
    fechaTime.setAttribute('datetime', pub.fecha_creacion);

    header.appendChild(avatar);
    header.appendChild(infoDiv);
    header.appendChild(fechaTime);

    // --- CONTENIDO ---
    var contenidoP = document.createElement('p');
    contenidoP.className  = 'pub-contenido';
    contenidoP.textContent = pub.contenido;

    // --- ACCIONES ---
    var footer = document.createElement('footer');
    footer.className = 'pub-acciones';

    // Botón like — usa addEventListener, no onclick
    var btnLike = document.createElement('button');
    btnLike.className   = 'btn-accion btn-like';
    btnLike.type        = 'button';
    btnLike.textContent = '♥ ' + pub.total_likes;
    btnLike.setAttribute('aria-label', 'Dar like a esta publicación');
    btnLike.addEventListener('click', function() {
        handleToggleLike(pub.id, btnLike);
    });

    // Botón comentar
    var btnComentar = document.createElement('button');
    btnComentar.className   = 'btn-accion btn-comentar';
    btnComentar.type        = 'button';
    btnComentar.textContent = '💬 ' + pub.total_comentarios;
    btnComentar.setAttribute('aria-label', 'Ver comentarios');
    btnComentar.addEventListener('click', function() {
        abrirModal(pub.id);
    });

    footer.appendChild(btnLike);
    footer.appendChild(btnComentar);

    // Botones de propietario (editar / eliminar)
    if (esPropietario || esAdmin) {
        var divProp = document.createElement('div');
        divProp.className = 'acciones-propietario';

        if (esPropietario) {
            var btnEditar = document.createElement('button');
            btnEditar.className   = 'btn-accion btn-editar';
            btnEditar.type        = 'button';
            btnEditar.textContent = '✎ Editar';
            btnEditar.addEventListener('click', function() {
                mostrarFormEdicion(pub.id, contenidoP, footer, btnEditar);
            });
            divProp.appendChild(btnEditar);
        }

        var btnEliminar = document.createElement('button');
        btnEliminar.className   = 'btn-accion btn-eliminar';
        btnEliminar.type        = 'button';
        btnEliminar.textContent = '✕ Eliminar';
        btnEliminar.addEventListener('click', function() {
            handleEliminarPublicacion(pub.id, article);
        });

        divProp.appendChild(btnEliminar);
        footer.appendChild(divProp);
    }

    // Ensamblar el article
    article.appendChild(header);
    article.appendChild(contenidoP);
    article.appendChild(footer);

    return article;
}

// ============================================================
// NUEVA PUBLICACIÓN
// ============================================================

async function handleNuevaPublicacion() {
    var textarea  = document.getElementById('nueva-pub-contenido');
    var contenido = textarea.value.trim();
    var errorDiv  = document.getElementById('error-nueva-pub');
    var btnSubmit = document.getElementById('btn-publicar');

    errorDiv.classList.add('oculto');

    if (!contenido) {
        errorDiv.textContent = 'El contenido no puede estar vacío.';
        errorDiv.classList.remove('oculto');
        return;
    }

    btnSubmit.disabled    = true;
    btnSubmit.textContent = 'Publicando…';

    try {
        var respuesta = await apiPost('/api/publicaciones', { contenido: contenido });
        var datos     = await respuesta.json();

        if (!respuesta.ok) {
            errorDiv.textContent = datos.error || 'Error al publicar.';
            errorDiv.classList.remove('oculto');
            return;
        }

        textarea.value = '';
        document.getElementById('char-count').textContent = '0 / 500';
        cargarPublicaciones();

    } catch (error) {
        errorDiv.textContent = 'Error de conexión.';
        errorDiv.classList.remove('oculto');
    } finally {
        btnSubmit.disabled    = false;
        btnSubmit.textContent = 'Publicar';
    }
}

// ============================================================
// EDITAR PUBLICACIÓN (formulario inline)
// ============================================================

function mostrarFormEdicion(idPub, elementoContenido, elementoFooter, btnEditar) {
    elementoContenido.classList.add('oculto');
    elementoFooter.classList.add('oculto');

    var formEdit = document.createElement('div');
    formEdit.className = 'edit-form';

    var textareaEdit = document.createElement('textarea');
    textareaEdit.rows      = 4;
    textareaEdit.maxLength = 500;
    textareaEdit.value     = elementoContenido.textContent;

    var divAcciones = document.createElement('div');
    divAcciones.className = 'edit-acciones';

    var btnGuardar = document.createElement('button');
    btnGuardar.className   = 'btn-primario btn-sm';
    btnGuardar.type        = 'button';
    btnGuardar.textContent = 'Guardar';

    var btnCancelar = document.createElement('button');
    btnCancelar.className   = 'btn-cancelar';
    btnCancelar.type        = 'button';
    btnCancelar.textContent = 'Cancelar';

    // Guardar cambios — addEventListener
    btnGuardar.addEventListener('click', async function() {
        var nuevoContenido = textareaEdit.value.trim();

        if (!nuevoContenido) {
            return;
        }

        btnGuardar.disabled    = true;
        btnGuardar.textContent = 'Guardando…';

        try {
            var respuesta = await apiPut('/api/publicaciones/' + idPub, { contenido: nuevoContenido });
            var datos     = await respuesta.json();

            if (respuesta.ok) {
                elementoContenido.textContent = nuevoContenido;
                elementoContenido.classList.remove('oculto');
                elementoFooter.classList.remove('oculto');
                formEdit.remove();
            } else {
                alert('Error: ' + (datos.error || 'No se pudo guardar.'));
                btnGuardar.disabled    = false;
                btnGuardar.textContent = 'Guardar';
            }
        } catch (error) {
            alert('Error de conexión.');
            btnGuardar.disabled    = false;
            btnGuardar.textContent = 'Guardar';
        }
    });

    // Cancelar edición — addEventListener
    btnCancelar.addEventListener('click', function() {
        elementoContenido.classList.remove('oculto');
        elementoFooter.classList.remove('oculto');
        formEdit.remove();
    });

    divAcciones.appendChild(btnCancelar);
    divAcciones.appendChild(btnGuardar);
    formEdit.appendChild(textareaEdit);
    formEdit.appendChild(divAcciones);

    elementoContenido.parentNode.insertBefore(formEdit, elementoContenido);
    textareaEdit.focus();
}

// ============================================================
// ELIMINAR PUBLICACIÓN
// ============================================================

async function handleEliminarPublicacion(idPub, elementoArticle) {
    var confirmado = confirm('¿Estás seguro que querés eliminar esta publicación?');

    if (!confirmado) {
        return;
    }

    try {
        var respuesta = await apiDelete('/api/publicaciones/' + idPub);
        var datos     = await respuesta.json();

        if (respuesta.ok) {
            elementoArticle.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            elementoArticle.style.opacity    = '0';
            elementoArticle.style.transform  = 'scale(0.97)';

            setTimeout(function() {
                elementoArticle.remove();
            }, 300);
        } else {
            alert('Error: ' + (datos.error || 'No se pudo eliminar.'));
        }
    } catch (error) {
        alert('Error de conexión.');
    }
}

// ============================================================
// TOGGLE LIKE
// ============================================================

async function handleToggleLike(idPub, btnLike) {
    try {
        var respuesta = await apiPost('/api/publicaciones/' + idPub + '/like', {});
        var datos     = await respuesta.json();

        if (respuesta.ok) {
            btnLike.textContent = '♥ ' + datos.total_likes;

            if (datos.accion === 'agregado') {
                btnLike.classList.add('liked');
                btnLike.setAttribute('aria-label', 'Quitar like');
            } else {
                btnLike.classList.remove('liked');
                btnLike.setAttribute('aria-label', 'Dar like');
            }
        }
    } catch (error) {
        console.error('Error en toggle like:', error);
    }
}

// ============================================================
// MODAL — usar el <dialog> nativo de HTML5
// ============================================================

async function abrirModal(idPub) {
    estadoApp.publicacionActual = idPub;

    var modal = document.getElementById('modal-pub');

    // Limpiar contenido anterior
    document.getElementById('modal-pub-body').innerHTML    = '';
    document.getElementById('modal-comentarios').innerHTML = '';

    // Abrir el dialog nativo (maneja backdrop y foco automáticamente)
    modal.showModal();

    try {
        var respuesta = await apiGet('/api/publicaciones/' + idPub);
        var datos     = await respuesta.json();

        if (!respuesta.ok) {
            return;
        }

        var pub = datos.publicacion;

        // --- Llenar el body del modal ---
        var modalBody = document.getElementById('modal-pub-body');

        var headerDiv = document.createElement('div');
        headerDiv.className = 'pub-card-header';
        headerDiv.style.marginBottom = '16px';

        var avatarDiv = document.createElement('div');
        avatarDiv.className        = 'pub-avatar';
        avatarDiv.textContent      = pub.autor_nombre.charAt(0).toUpperCase();
        avatarDiv.setAttribute('aria-hidden', 'true');

        var infoDiv = document.createElement('div');

        var nombreP = document.createElement('p');
        nombreP.className   = 'pub-autor-nombre';
        nombreP.textContent = pub.autor_nombre;

        var usernameP = document.createElement('p');
        usernameP.className   = 'pub-autor-username';
        usernameP.textContent = '@' + pub.autor_username;

        infoDiv.appendChild(nombreP);
        infoDiv.appendChild(usernameP);
        headerDiv.appendChild(avatarDiv);
        headerDiv.appendChild(infoDiv);

        var contenidoP = document.createElement('p');
        contenidoP.className   = 'pub-contenido';
        contenidoP.textContent = pub.contenido;

        var likesP = document.createElement('p');
        likesP.style.color    = 'var(--color-texto-suave)';
        likesP.style.fontSize = '13px';
        likesP.style.marginTop = '8px';
        likesP.textContent    = '♥ ' + pub.total_likes + ' likes';

        modalBody.appendChild(headerDiv);
        modalBody.appendChild(contenidoP);
        modalBody.appendChild(likesP);

        // --- Llenar comentarios ---
        renderizarComentarios(pub.comentarios || []);

    } catch (error) {
        console.error('Error al abrir modal:', error);
    }
}

function cerrarModal() {
    var modal = document.getElementById('modal-pub');
    modal.close();
    estadoApp.publicacionActual = null;

    var inputComentario = document.getElementById('input-comentario');
    inputComentario.value = '';
}

// ============================================================
// COMENTARIOS
// ============================================================

function renderizarComentarios(comentarios) {
    var lista = document.getElementById('modal-comentarios');
    lista.innerHTML = '';

    if (comentarios.length === 0) {
        var vacio = document.createElement('li');
        vacio.style.color    = 'var(--color-texto-suave)';
        vacio.style.fontSize = '13px';
        vacio.style.padding  = '12px 0';
        vacio.style.fontStyle = 'italic';
        vacio.textContent    = 'Todavía no hay comentarios.';
        lista.appendChild(vacio);
        return;
    }

    comentarios.forEach(function(com) {
        var item = crearElementoComentario(com);
        lista.appendChild(item);
    });
}

function crearElementoComentario(com) {
    var esPropietario = (com.autor_id === estadoApp.usuario.id);
    var esAdmin       = (estadoApp.usuario.rol === 'admin');

    // Usamos <li> porque está dentro de una <ul> semántica
    var li = document.createElement('li');
    li.className  = 'comentario-item';
    li.dataset.id = com.id;

    var headerDiv = document.createElement('div');
    headerDiv.className = 'comentario-header';

    var autorSpan = document.createElement('span');
    autorSpan.className   = 'comentario-autor';
    autorSpan.textContent = com.autor_nombre;

    var usernameSpan = document.createElement('span');
    usernameSpan.className   = 'comentario-username';
    usernameSpan.textContent = '@' + com.autor_username;

    var fecha = new Date(com.fecha_creacion);
    var fechaTime = document.createElement('time');
    fechaTime.className   = 'comentario-fecha';
    fechaTime.textContent = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    fechaTime.setAttribute('datetime', com.fecha_creacion);

    headerDiv.appendChild(autorSpan);
    headerDiv.appendChild(usernameSpan);
    headerDiv.appendChild(fechaTime);

    // Botón eliminar para propietario o admin — addEventListener
    if (esPropietario || esAdmin) {
        var btnEliminar = document.createElement('button');
        btnEliminar.className   = 'btn-eliminar-com';
        btnEliminar.type        = 'button';
        btnEliminar.textContent = '✕';
        btnEliminar.setAttribute('aria-label', 'Eliminar comentario');
        btnEliminar.addEventListener('click', function() {
            handleEliminarComentario(com.id, li);
        });
        headerDiv.appendChild(btnEliminar);
    }

    var textoP = document.createElement('p');
    textoP.className   = 'comentario-texto';
    textoP.textContent = com.contenido;

    li.appendChild(headerDiv);
    li.appendChild(textoP);

    return li;
}

async function handleNuevoComentario() {
    var input     = document.getElementById('input-comentario');
    var contenido = input.value.trim();

    if (!contenido || !estadoApp.publicacionActual) {
        return;
    }

    try {
        var respuesta = await apiPost(
            '/api/publicaciones/' + estadoApp.publicacionActual + '/comentarios',
            { contenido: contenido }
        );

        var datos = await respuesta.json();

        if (respuesta.ok) {
            input.value = '';

            var lista = document.getElementById('modal-comentarios');

            // Si había el mensaje "sin comentarios", limpiarlo
            var primerItem = lista.querySelector('li');
            if (primerItem && primerItem.querySelector('span') === null) {
                lista.innerHTML = '';
            }

            var nuevoItem = crearElementoComentario(datos.comentario);
            lista.appendChild(nuevoItem);

            nuevoItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            alert('Error: ' + (datos.error || 'No se pudo comentar.'));
        }
    } catch (error) {
        alert('Error de conexión.');
    }
}

async function handleEliminarComentario(idComentario, elementoLi) {
    try {
        var respuesta = await apiDelete('/api/comentarios/' + idComentario);
        var datos     = await respuesta.json();

        if (respuesta.ok) {
            elementoLi.style.transition = 'opacity 0.3s ease';
            elementoLi.style.opacity    = '0';

            setTimeout(function() {
                elementoLi.remove();
            }, 300);
        } else {
            alert('Error: ' + (datos.error || 'No se pudo eliminar.'));
        }
    } catch (error) {
        alert('Error de conexión.');
    }
}
