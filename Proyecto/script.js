// ============================================================================
//  Dispensador de papel higiénico - Instituto Universitario
//  Autor: (Tu nombre)
//  Descripción:
//    Ejemplo de aplicación web sencilla con HTML, CSS y JavaScript puro.
//    La aplicación permite iniciar sesión con dos usuarios de prueba y
//    simula un dispensador de papel que solo puede usarse 2 veces por día,
//    entregando 5 cuadros de papel en cada uso.
//
//    La información se almacena en localStorage por usuario y fecha,
//    para que el historial del día no se pierda si se recarga la página.
// ============================================================================

// --------------------------------------------------------------------------
// 1. Constantes y variables globales
// --------------------------------------------------------------------------

// Usuarios quemados (de prueba) con sus contraseñas.
const USERS = {
    // usuario : contraseña
    "pepito": "pepito123",
    "Juancito": "Juancito123"
};

// Máximo de usos permitidos por día (cada uso son 5 cuadros de papel).
const MAX_USOS_DIARIOS = 2;

// Variables para guardar el usuario actualmente autenticado y sus datos del día.
let currentUser = null;
let userDataHoy = null; // { date: 'YYYY-MM-DD', usos: [ 'HH:MM:SS', ... ] }

// Referencias a elementos del DOM.
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");

const loginForm = document.getElementById("login-form");
const inputUsername = document.getElementById("username");
const inputPassword = document.getElementById("password");
const loginError = document.getElementById("login-error");

const welcomeText = document.getElementById("welcome-text");
const todayDateSpan = document.getElementById("today-date");
const usosRealizadosSpan = document.getElementById("usos-realizados");
const usosRestantesSpan = document.getElementById("usos-restantes");
const usageList = document.getElementById("usage-list");
const dispenseMessage = document.getElementById("dispense-message");

const btnDispensar = document.getElementById("btn-dispensar");
const btnLogout = document.getElementById("btn-logout");

// --------------------------------------------------------------------------
// 2. Funciones de utilidad para fechas y almacenamiento
// --------------------------------------------------------------------------

/**
 * Devuelve la fecha de hoy en formato YYYY-MM-DD.
 * Este formato facilita usarla como parte de la clave en localStorage.
 */
function getFechaHoyISO() {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const day = String(hoy.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Devuelve la hora actual en formato HH:MM:SS (24 horas).
 */
function getHoraActual() {
    const ahora = new Date();
    const hours = String(ahora.getHours()).padStart(2, "0");
    const minutes = String(ahora.getMinutes()).padStart(2, "0");
    const seconds = String(ahora.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Devuelve una versión "bonita" de la fecha actual para mostrar al usuario.
 * Ejemplo: "13/11/2025"
 */
function getFechaBonita() {
    const hoy = new Date();
    const day = String(hoy.getDate()).padStart(2, "0");
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const year = hoy.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Construye la clave de localStorage para guardar los datos de un usuario
 * en una fecha específica.
 * @param {string} usuario - nombre de usuario (pepito, Juancito, etc.)
 * @param {string} fechaISO - fecha en formato YYYY-MM-DD
 */
function buildStorageKey(usuario, fechaISO) {
    return `dispensador_${usuario}_${fechaISO}`;
}

/**
 * Carga desde localStorage la información del día actual para el usuario.
 * Si no existe información previa, se crea un objeto nuevo con un arreglo vacío.
 * @param {string} usuario
 * @returns {object} Objeto con estructura { date: 'YYYY-MM-DD', usos: [] }
 */
function loadUserDataForToday(usuario) {
    const fechaISO = getFechaHoyISO();
    const key = buildStorageKey(usuario, fechaISO);
    const raw = localStorage.getItem(key);

    if (raw) {
        // Ya hay datos guardados para este usuario y fecha.
        try {
            const data = JSON.parse(raw);
            return data;
        } catch (e) {
            // Si algo sale mal al parsear, se crea un objeto nuevo.
            console.error("Error al parsear datos de localStorage:", e);
        }
    }

    // Si no hay nada guardado todavía, devolvemos un objeto nuevo.
    const dataNueva = {
        date: fechaISO,
        usos: [] // aquí se guardarán las horas de los usos realizados
    };
    localStorage.setItem(key, JSON.stringify(dataNueva));
    return dataNueva;
}

/**
 * Guarda en localStorage la información del día actual para el usuario.
 * @param {string} usuario
 * @param {object} data
 */
function saveUserDataForToday(usuario, data) {
    const key = buildStorageKey(usuario, data.date);
    localStorage.setItem(key, JSON.stringify(data));
}

// --------------------------------------------------------------------------
// 3. Manejo de autenticación (inicio y cierre de sesión)
// --------------------------------------------------------------------------

/**
 * Valida las credenciales ingresadas contra la lista de usuarios quemados.
 * @param {string} username
 * @param {string} password
 * @returns {boolean} true si son correctas, false si no.
 */
function validateCredentials(username, password) {
    // Verificamos si el usuario existe y la contraseña coincide.
    return USERS[username] !== undefined && USERS[username] === password;
}

/**
 * Muestra la vista de login y oculta la vista de la app.
 */
function showLoginView() {
    appView.classList.add("hidden");
    loginView.classList.remove("hidden");
    loginError.classList.add("hidden");
    loginError.textContent = "";
    // Limpiamos el formulario
    loginForm.reset();
    currentUser = null;
    userDataHoy = null;
}

/**
 * Muestra la vista de la app (dispensador) y oculta la vista de login.
 */
function showAppView() {
    loginView.classList.add("hidden");
    appView.classList.remove("hidden");
}

/**
 * Maneja el envío del formulario de inicio de sesión.
 */
function handleLoginSubmit(event) {
    event.preventDefault(); // Evita que la página se recargue.

    const username = inputUsername.value.trim();
    const password = inputPassword.value.trim();

    if (!validateCredentials(username, password)) {
        loginError.textContent = "Usuario o contraseña incorrectos. Intenta de nuevo.";
        loginError.classList.remove("hidden");
        return;
    }

    // Si las credenciales son válidas:
    currentUser = username;
    userDataHoy = loadUserDataForToday(currentUser);

    // Configuramos la interfaz para el usuario autenticado.
    prepareAppForUser(currentUser);

    // Mostramos la vista de la app.
    showAppView();
}

/**
 * Maneja la acción de cerrar sesión.
 */
function handleLogout() {
    showLoginView();
}

// --------------------------------------------------------------------------
// 4. Lógica del dispensador y actualización de la interfaz
// --------------------------------------------------------------------------

/**
 * Prepara la vista principal para el usuario autenticado.
 * @param {string} usuario
 */
function prepareAppForUser(usuario) {
    // Mensaje de bienvenida (ejemplo: "Bienvenido, pepito").
    welcomeText.textContent = `Bienvenido, ${usuario}.`;

    // Fecha de hoy (texto amigable).
    todayDateSpan.textContent = getFechaBonita();

    // Actualiza la información de usos e historial en la pantalla.
    refreshUsageInfo();
}

/**
 * Actualiza la sección de estado (usos realizados y restantes) y
 * el listado de historial de usos.
 */
function refreshUsageInfo() {
    if (!userDataHoy) return;

    const usosRealizados = userDataHoy.usos.length;
    const usosRestantes = Math.max(0, MAX_USOS_DIARIOS - usosRealizados);

    // Actualizamos los contadores en la interfaz.
    usosRealizadosSpan.textContent = usosRealizados;
    usosRestantesSpan.textContent = usosRestantes;

    // Si ya no hay usos restantes, deshabilitamos el botón.
    if (usosRestantes === 0) {
        btnDispensar.disabled = true;
    } else {
        btnDispensar.disabled = false;
    }

    // Limpiamos la lista y la reconstruimos.
    usageList.innerHTML = "";

    if (usosRealizados === 0) {
        const li = document.createElement("li");
        li.textContent = "Aún no has sacado papel hoy.";
        usageList.appendChild(li);
    } else {
        userDataHoy.usos.forEach((hora, index) => {
            const li = document.createElement("li");
            li.textContent = `Uso ${index + 1}: 5 cuadros de papel a las ${hora}`;
            usageList.appendChild(li);
        });
    }
}

/**
 * Muestra un mensaje en la zona de mensajes de la vista de la app.
 * @param {string} text - Texto del mensaje.
 * @param {"error" | "success"} type - Tipo de mensaje (color rojo o verde).
 */
function showDispenseMessage(text, type) {
    dispenseMessage.textContent = text;
    dispenseMessage.classList.remove("hidden");
    dispenseMessage.classList.remove("error", "success");

    if (type === "error") {
        dispenseMessage.classList.add("error");
    } else if (type === "success") {
        dispenseMessage.classList.add("success");
    }
}

/**
 * Maneja el clic en el botón "Sacar 5 cuadros de papel".
 */
function handleDispensarClick() {
    if (!currentUser || !userDataHoy) {
        // Por seguridad, si por alguna razón no hay usuario cargado, no hacemos nada.
        showDispenseMessage("Debes iniciar sesión para usar el dispensador.", "error");
        return;
    }

    const usosRealizados = userDataHoy.usos.length;

    if (usosRealizados >= MAX_USOS_DIARIOS) {
        // Ya alcanzó el límite de usos por hoy.
        showDispenseMessage(
            "Ya has utilizado tus dos turnos de papel hoy. No puedes sacar más papel en el día.",
            "error"
        );
        refreshUsageInfo();
        return;
    }

    // Aún tiene usos disponibles. Registramos la hora actual.
    const hora = getHoraActual();
    userDataHoy.usos.push(hora);

    // Guardamos los cambios en localStorage.
    saveUserDataForToday(currentUser, userDataHoy);

    // Actualizamos la interfaz.
    refreshUsageInfo();

    showDispenseMessage(
        `Se han dispensado 5 cuadros de papel correctamente a las ${hora}.`,
        "success"
    );
}

// --------------------------------------------------------------------------
// 5. Inicialización de eventos y estado inicial
// --------------------------------------------------------------------------

// Asociamos eventos a los elementos de la interfaz.
loginForm.addEventListener("submit", handleLoginSubmit);
btnLogout.addEventListener("click", handleLogout);
btnDispensar.addEventListener("click", handleDispensarClick);

// Al cargar la página, mostramos por defecto la vista de login.
showLoginView();
