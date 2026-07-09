// PARTE 1 DE 3: Variables, Lobby y Configuración del Chat

const socket = io();
const sonidoMover = new Audio('mover.mp3');
const sonidoRosa = new Audio('capturar.mp3'); 
let casillaOrigen = null;
let turnoActual = "blancas";
let juegoTerminado = false;
const entradaApodo = document.getElementById('entrada-apodo');
let partidaIniciada = false; // NUEVO: Interruptor para pausar el reloj al inicio

// --- CONTROL LÓGICO DE ENTRADA A SALAS (LOBBY) ---
const pantallaLobby = document.getElementById('pantalla-lobby');
const contenedorPrincipal = document.getElementById('contenedor-principal');
const entradaSala = document.getElementById('entrada-sala');
const btnEntrarSala = document.getElementById('btn-entrar-sala');
const btnCrearCodigoSala = document.getElementById('btn-crear-codigo-sala');
const txtSalaActual = document.getElementById('txt-sala-actual');

btnEntrarSala.addEventListener('click', () => {
  const nombreSala = entradaSala.value.trim().toLowerCase();
  
  if (nombreSala === "") {
    alert("Por favor, escribe un código para la sala.");
    return;
  }

  // 1. Ocultar la pantalla del lobby y mostrar el juego completo
  pantallaLobby.classList.add('oculto');
  contenedorPrincipal.classList.remove('oculto');

   // NUEVO: Imprimir el código arriba al unirte a la sala de tu oponente
   txtSalaActual.textContent = nombreSala.toUpperCase();

  // 2. Conectarse formalmente a la habitación digital en el servidor
  socket.emit('unirse-a-sala', nombreSala);
  actualizarBrilloRelojes();

});

// Permitir entrar a la sala presionando también Enter en el teclado
entradaSala.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') btnEntrarSala.click();
});

// Función para generar un código único de 5 letras Cyberpunk
function generarCodigoSala() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let resultado = '';
  for (let i = 0; i < 5; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return resultado;
}

// Evento para el jugador que fabrica la sala privada
btnCrearCodigoSala.addEventListener('click', () => {
  const codigoInventado = "sala-" + generarCodigoSala();
  
  // 1. Ocultar el lobby y mostrar el tablero
  pantallaLobby.classList.add('oculto');
  contenedorPrincipal.classList.remove('oculto');

  // 2. Imprimir el código arriba para que puedas copiarlo y mandárselo a tu amigo
  txtSalaActual.textContent = codigoInventado.toUpperCase(); 

  // 3. Viajar inalámbricamente al servidor
  socket.emit('unirse-a-sala', codigoInventado);
  actualizarBrilloRelojes();
});


// --- CAPTURAR ELEMENTOS DEL CHAT EN VIVO ---
const mensajesChat = document.getElementById('mensajes-chat');
const entradaMensaje = document.getElementById('entrada-mensaje');
const btnEnviarChat = document.getElementById('btn-enviar-chat');

// 1. FUNCIÓN PARA ENVIAR EL TEXTO
function enviarMensajeTexto() {
  const texto = entradaMensaje.value.trim();
  if (texto === "") return;

  // Capturar el apodo escrito por el usuario (si está vacío, usa "Anónimo")
  const apodo = entradaApodo.value.trim() || "Anónimo";
  const bandoTexto = bandoAsignado === "blancas" ? "⚪" : (bandoAsignado === "negras" ? "⚫" : "👁️");

  // El nombre final unirá su emoji de bando con su nombre elegido
  const nombreRemitente = `${bandoTexto} ${apodo}`;
  const datos = { remitente: nombreRemitente, texto: texto };

  // Mostrar en tu pantalla de inmediato (en fucsia)
  //agregarMensajeAlCuadro(datos, "yo");
  
  // ¡MUY IMPORTANTE! Esta línea envía el mensaje por internet al servidor
  socket.emit('enviar-mensaje', datos);
  
  entradaMensaje.value = "";
} // <-- AQUÍ TERMINA EMITIR MENSAJE

// Escuchar clics en el botón de la flecha o al presionar "Enter" en el teclado
btnEnviarChat.addEventListener('click', enviarMensajeTexto);
entradaMensaje.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') enviarMensajeTexto();
});

// 2. FUNCIÓN SEPARADA E INDEPENDIENTE PARA PINTAR EN PANTALLA
function agregarMensajeAlCuadro(datos, claseOrigen) {
  const div = document.createElement('div');
  div.classList.add('mensaje', claseOrigen);
  
  // Si el mensaje viene con un número de color asignado por el servidor, se lo aplicamos
  if (datos.numColor !== undefined) {
    div.classList.add(`msg-neon-${datos.numColor}`);
  }
  
  div.innerHTML = `<span class="remitente">[${datos.remitente}]:</span> ${datos.texto}`;
  mensajesChat.appendChild(div);
  mensajesChat.scrollTop = mensajesChat.scrollHeight; // Auto-scroll al fondo
} // <-- AQUÍ TERMINA PINTAR EN PANTALLA


// Escuchar clics en el botón de la flecha o al presionar "Enter" en el teclado
btnEnviarChat.addEventListener('click', enviarMensajeTexto);
entradaMensaje.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') enviarMensajeTexto();
});

// Función para pintar la burbuja de texto dentro del contenedor
// FUNCIÓN BLINDADA PARA FORCEAR LOS COLORES NEÓN EN EL NICKNAME
function agregarMensajeAlCuadro(datos, claseOrigen) {
  const div = document.createElement('div');
  div.classList.add('mensaje', claseOrigen);
  
  // Imprimir en la consola (F12) para revisar qué datos están viajando por la red
  console.log("Datos recibidos en el chat por internet:", datos);

  // CORRECCIÓN DE SEGURIDAD: Si por alguna razón el servidor no envía un número, 
  // le asignamos el color 0 (Cian) de forma temporal para que nunca se quede blanco.
  const colorAsignado = (datos.numColor !== undefined) ? datos.numColor : 0;
  
  // Añadimos la clase neón de forma obligatoria al contenedor del mensaje
  div.classList.add(`msg-neon-${colorAsignado}`);
  
  div.innerHTML = `<span class="remitente">[${datos.remitente}]:</span> ${datos.texto}`;
  mensajesChat.appendChild(div);
  mensajesChat.scrollTop = mensajesChat.scrollHeight; // Auto-scroll al fondo
}


// --- CONTROL DE BANDO ELEGIDO POR EL USUARIO ---
let bandoAsignado = "espectador"; 
const selectorBando = document.getElementById('selector-bando');

// Avisar al servidor inalámbrico limpiamente (se eliminó el duplicado conflictivo)
selectorBando.addEventListener('change', (e) => {
  const bandoDeseado = e.target.value;
  bandoAsignado = bandoDeseado; 
  socket.emit('solicitar-bando', bandoDeseado);
});

// ==========================================
// --- VARIABLES DEL TEMPORIZADOR NEÓN ---
// ==========================================
let tiempoBlancas = 300; // 5 minutos en segundos (5 * 60)
let tiempoNegras = 300;
let intervaloReloj = null; // Guardará el segundero de JavaScript

const txtTiempoBlancas = document.getElementById('tiempo-blancas');
const txtTiempoNegras = document.getElementById('tiempo-negras');
const bloqueBlancas = document.getElementById('bloque-reloj-blancas');
const bloqueNegras = document.getElementById('bloque-reloj-negras');

// Función para alternar el brillo neón cian en la pantalla
function actualizarBrilloRelojes() {
  if (juegoTerminado) {
    bloqueBlancas.classList.remove('activo');
    bloqueNegras.classList.remove('activo');
    return;
  }
  if (turnoActual === "blancas") {
    bloqueBlancas.classList.add('activo');
    bloqueNegras.classList.remove('activo');
  } else {
    bloqueNegras.classList.add('activo');
    bloqueBlancas.classList.remove('activo');
  }
}

// Función matemática para transformar segundos en formato de texto digital (05:00)
function formatearTiempo(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
}

// El motor que descuenta 1 segundo cada 1000 milisegundos
// Función del segundero modificada para respetar la primera jugada
function iniciarSegundero() {
  clearInterval(intervaloReloj); // Limpiar cualquier segundero viejo
  actualizarBrilloRelojes();

  // NUEVO: Si la partida aún no inicia, dejamos el reloj en pausa visual
  if (!partidaIniciada) return; 

  intervaloReloj = setInterval(() => {
    if (juegoTerminado) {
      clearInterval(intervaloReloj);
      return;
    }

    if (turnoActual === "blancas") {
      tiempoBlancas--;
      txtTiempoBlancas.textContent = formatearTiempo(tiempoBlancas);
      if (tiempoBlancas <= 0) declararVictoriaPorTiempo("negras");
    } else {
      tiempoNegras--;
      txtTiempoNegras.textContent = formatearTiempo(tiempoNegras);
      if (tiempoNegras <= 0) declararVictoriaPorTiempo("blancas");
    }
  }, 1000);
}


// Detiene el juego si el marcador digital llega a 00:00
function declararVictoriaPorTiempo(ganador) {
  juegoTerminado = true;
  clearInterval(intervaloReloj);
  actualizarBrilloRelojes();
  indicadorTurno.textContent = "PARTIDA TERMINADA";
  
  mensajeGanador.textContent = ganador === "blancas" 
    ? "¡Ganaron las piezas BLANCAS por tiempo!" 
    : "¡Ganaron las piezas NEGRAS por tiempo!";
    
  pantallaVictoria.classList.remove('oculto');
}


//PARTE 2 DE 3: Reglas del Ajedrez y Estado Inicial

const piezasBlancas = ["♙", "♖", "♘", "♗", "♕", "♔"];
const piezasNegras  = ["♟", "♜", "♞", "♝", "♛", "♚"];
const estadoInicial = [
  "♜","♞","♝","♛","♚","♝","♞","♜",
  "♟","♟","♟","♟","♟","♟","♟","♟",
  "","","","","","","","",
  "","","","","","","","",
  "","","","","","","","",
  "","","","","","","","",
  "♙","♙","♙","♙","♙","♙","♙","♙",
  "♖","♘","♗","♕","♔","♗","♘","♖"
];

const casillas = document.querySelectorAll('.casilla');
const indicadorTurno = document.getElementById('bando-actual');
const btnReiniciar = document.getElementById('btn-reiniciar');
const btnIniciarPartida = document.getElementById('btn-iniciar-partida');
const cementerioBlancas = document.getElementById('capturadas-blancas');
const cementerioNegras = document.getElementById('capturadas-negras');
const pantallaVictoria = document.getElementById('pantalla-victoria');
const mensajeGanador = document.getElementById('mensaje-ganador');

// Evento local para arrancar la partida
btnIniciarPartida.addEventListener('click', () => {
  // Solo los jugadores reales pueden dar inicio (opcional, si quieres que espectadores también puedan, quita el bandoAsignado)
  if (bandoAsignado === "espectador") {
    alert("Solo los jugadores pueden iniciar el temporizador.");
    return;
  }
  socket.emit('solicitar-inicio-partida');
});


// Temporizador
btnReiniciar.addEventListener('click', () => {
  casillas.forEach((casilla, index) => {
    casilla.textContent = estadoInicial[index];
    casilla.classList.remove('seleccionada');
  });

  casillaOrigen = null;
  turnoActual = "blancas";
  juegoTerminado = false;
  indicadorTurno.textContent = "BLANCAS";
  cementerioBlancas.innerHTML = "";
  cementerioNegras.innerHTML = "";
  pantallaVictoria.classList.add('oculto');

  selectorBando.value = "espectador"; 
  bandoAsignado = "espectador";

  // --- NUEVO: ESTAS SON LAS LÍNEAS DE RESETEO DEL TIEMPO ---
  clearInterval(intervaloReloj); // Apaga el segundero si estaba corriendo
  tiempoBlancas = 300;           // Regresa el contador a 5 minutos
  tiempoNegras = 300;            // Regresa el contador a 5 minutos
  txtTiempoBlancas.textContent = "05:00"; // Cambia el texto en pantalla
  txtTiempoNegras.textContent = "05:00";  // Cambia el texto en pantalla
  actualizarBrilloRelojes();     // Apaga las luces cian neón de los relojes
  
  // --------------------------------------------------------
  partidaIniciada = false; // <-- ¡NUEVA LÍNEA AQUÍ! Pausa el reloj localmente
  // -------------------------------------------------------------

   // --- Vuelve a mostrar el botón verde localmente ---
  btnIniciarPartida.classList.remove('oculto'); 
  // -----------------------------------------------------------------

  // Avisar al servidor 
  socket.emit('solicitar-reinicio');
});


function validarMovimientoPeon(fOrigen, cOrigen, fDestino, cDestino, pieza, esCasillaVacia) {
  const difFila = fDestino - fOrigen;
  const difCol = Math.abs(cDestino - cOrigen);
  if (pieza === "♙") {
    if (difCol === 0 && difFila === -1 && esCasillaVacia) return true;
    if (difCol === 0 && fOrigen === 6 && difFila === -2 && esCasillaVacia) return true;
    if (difCol === 1 && difFila === -1 && !esCasillaVacia) return true;
  }
  if (pieza === "♟") {
    if (difCol === 0 && difFila === 1 && esCasillaVacia) return true;
    if (difCol === 0 && fOrigen === 1 && difFila === 2 && esCasillaVacia) return true;
    if (difCol === 1 && difFila === 1 && !esCasillaVacia) return true;
  }
  return false;
}

function validarMovimientoTorre(fOrigen, cOrigen, fDestino, cDestino) {
  if (fOrigen !== fDestino && cOrigen !== cDestino) return false;
  const pasoFila = fOrigen === fDestino ? 0 : (fDestino > fOrigen ? 1 : -1);
  const pasoCol  = cOrigen === cDestino ? 0 : (cDestino > cOrigen ? 1 : -1);
  let fActual = fOrigen + pasoFila;
  let cActual = cOrigen + pasoCol;
  while (fActual !== fDestino || cActual !== cDestino) {
    const casillaCamino = document.querySelector(`[data-fila="${fActual}"][data-col="${cActual}"]`);
    if (casillaCamino.textContent !== "") return false; 
    fActual += pasoFila;
    cActual += pasoCol;
  }
  return true;
}

function validarMovimientoAlfil(fOrigen, cOrigen, fDestino, cDestino) {
  if (Math.abs(fDestino - fOrigen) !== Math.abs(cDestino - cOrigen)) return false;
  const pasoFila = fDestino > fOrigen ? 1 : -1;
  const pasoCol  = cDestino > cOrigen ? 1 : -1;
  let fActual = fOrigen + pasoFila;
  let cActual = cOrigen + pasoCol;
  while (fActual !== fDestino && cActual !== cDestino) {
    const casillaCamino = document.querySelector(`[data-fila="${fActual}"][data-col="${cActual}"]`);
    if (casillaCamino.textContent !== "") return false; 
    fActual += pasoFila;
    cActual += pasoCol;
  }
  return true;
}

function validarMovimientoCaballo(fOrigen, cOrigen, fDestino, cDestino) {
  const dFila = Math.abs(fDestino - fOrigen);
  const dCol = Math.abs(cDestino - cOrigen);
  return (dFila === 2 && dCol === 1) || (dFila === 1 && dCol === 2);
}

function validarMovimientoRey(fOrigen, cOrigen, fDestino, cDestino) {
  const dFila = Math.abs(fDestino - fOrigen);
  const dCol = Math.abs(cDestino - cOrigen);
  return dFila <= 1 && dCol <= 1;
}

function verificarFinDePartido(piezaCapturada) {
  if (piezaCapturada === "♔") {
    juegoTerminado = true;
    indicadorTurno.textContent = "PARTIDA TERMINADA";
    mensajeGanador.textContent = "Ganaron las piezas NEGRAS capturando al Rey";
    pantallaVictoria.classList.remove('oculto');
  } else if (piezaCapturada === "♚") {
    juegoTerminado = true;
    indicadorTurno.textContent = "PARTIDA TERMINADA";
    mensajeGanador.textContent = "Ganaron las piezas BLANCAS capturando al Rey";
    pantallaVictoria.classList.remove('oculto');
  }
}

//PARTE 3 DE 3: Movimientos, Lógica de Sockets y Filtros Espejo
// --- LÓGICA DE SELECCIÓN Y MOVIMIENTO EN PANTALLA ---
casillas.forEach(casilla => {
  casilla.addEventListener('click', (e) => {

    // --- NUEVO FILTRO DE SEGURIDAD: CANCHADO DEL TABLERO ---
    // Si la partida aún no inicia formalmente con el botón verde, ignoramos cualquier clic en el tablero
    if (!partidaIniciada) {
      alert("Debes presionar el botón 'Iniciar Partida' verde antes de poder mover las piezas.");
      return; 
    }

    if (juegoTerminado || bandoAsignado === "espectador") return;

    const fClick = parseInt(e.currentTarget.getAttribute('data-fila'));
    const cClick = parseInt(e.currentTarget.getAttribute('data-col'));
    const contenidoClick = e.currentTarget.textContent;

    const esMiPieza = (turnoActual === "blancas" && piezasBlancas.includes(contenidoClick)) ||
                      (turnoActual === "negras" && piezasNegras.includes(contenidoClick));

    if (casillaOrigen === null) {
      if (esMiPieza && bandoAsignado === turnoActual) {
        casillaOrigen = e.currentTarget;
        casillaOrigen.classList.add('seleccionada');
      }
    } else {
      const fOri = parseInt(casillaOrigen.getAttribute('data-fila'));
      const cOri = parseInt(casillaOrigen.getAttribute('data-col'));
      const piezaMover = casillaOrigen.textContent;

      if (fOri === fClick && cOri === cClick) {
        casillaOrigen.classList.remove('seleccionada');
        casillaOrigen = null;
        return;
      }

      if (esMiPieza) {
        casillaOrigen.classList.remove('seleccionada');
        casillaOrigen = e.currentTarget;
        casillaOrigen.classList.add('seleccionada');
        return;
      }

      let movimientoValido = false;
      const esVacia = contenidoClick === "";

      if (piezaMover === "♙" || piezaMover === "♟") {
        movimientoValido = validarMovimientoPeon(fOri, cOri, fClick, cClick, piezaMover, esVacia);
      } else if (piezaMover === "♖" || piezaMover === "♜") {
        movimientoValido = validarMovimientoTorre(fOri, cOri, fClick, cClick);
      } else if (piezaMover === "♗" || piezaMover === "♝") {
        movimientoValido = validarMovimientoAlfil(fOri, cOri, fClick, cClick);
      } else if (piezaMover === "♘" || piezaMover === "♞") {
        movimientoValido = validarMovimientoCaballo(fOri, cOri, fClick, cClick);
      } else if (piezaMover === "♕" || piezaMover === "♛") {
        movimientoValido = validarMovimientoTorre(fOri, cOri, fClick, cClick) || 
                           validarMovimientoAlfil(fOri, cOri, fClick, cClick);
      } else if (piezaMover === "♔" || piezaMover === "♚") {
        movimientoValido = validarMovimientoRey(fOri, cOri, fClick, cClick);
      }

      if (movimientoValido) {
        ejecutarMovimientoLogico(fOri, cOri, fClick, cClick);
        
        // ACTIVAMOS LA PARTIDA
        //partidaIniciada = true; 

        // --- NUEVO: Capturar una foto instantánea del estado de las 64 casillas ---
        const fotoActual = Array.from(casillas).map(c => c.textContent);

        // MODIFICADO: Enviamos el movimiento agregando bando, tiempos y la foto del tablero
        socket.emit('movimiento-ajedrez', {
          fOri: fOri, cOri: cOri, fDes: fClick, cDes: cClick,
          bandoRemitente: bandoAsignado,
          tBlancas: tiempoBlancas, 
          tNegras: tiempoNegras,
          fotoTablero: fotoActual // <-- NUEVA PROPIEDAD DE RED
        });

        iniciarSegundero(); 
      }

    }
  });
});

function ejecutarMovimientoLogico(fOri, cOri, fDes, cDes) {
  const cOrigen = document.querySelector(`[data-fila="${fOri}"][data-col="${cOri}"]`);
  const cDestino = document.querySelector(`[data-fila="${fDes}"][data-col="${cDes}"]`);
  const pieza = cOrigen.textContent;
  const captura = cDestino.textContent;

  if (captura !== "") {
    sonidoRosa.play();
    const span = document.createElement('span');
    span.textContent = captura;
    if (piezasBlancas.includes(captura)) {
      cementerioNegras.appendChild(span);
    } else {
      cementerioBlancas.appendChild(span);
    }
    verificarFinDePartido(captura);
  } else {
    sonidoMover.play();
  }

  cDestino.textContent = pieza;
  cOrigen.textContent = "";
  if (casillaOrigen) casillaOrigen.classList.remove('seleccionada');
  casillaOrigen = null;

  if (!juegoTerminado) {
    turnoActual = turnoActual === "blancas" ? "negras" : "blancas";
    indicadorTurno.textContent = turnoActual.toUpperCase();
  }
}

function moverPiezaEnPantalla(fOri, cOri, fDes, cDes) {
  ejecutarMovimientoLogico(fOri, cOri, fDes, cDes);
}

// =======================================================
// --- RECEPTORES INALÁMBRICOS DE SOCKETS REVISADOS ---
// =======================================================

// --- 1. RECEPTOR DE MOVIMIENTOS CON FILTRO ESPEJO ---
socket.on('oponente-movio', (datos) => {
  if (datos.bandoRemitente === bandoAsignado) return; // Ignora jugada propia
  
  // Sincronizar tiempos si viajan en la red
  if (datos.tBlancas !== undefined) {
    tiempoBlancas = datos.tBlancas;
    tiempoNegras = datos.tNegras;
    txtTiempoBlancas.textContent = formatearTiempo(tiempoBlancas);
    txtTiempoNegras.textContent = formatearTiempo(tiempoNegras);
  }

  moverPiezaEnPantalla(datos.fOri, datos.cOri, datos.fDes, datos.cDes);
  
  // Forzamos el encendido de los relojes si la partida ya está en curso
  partidaIniciada = true; 
  iniciarSegundero(); 
});

// --- 2. RECEPTOR DE REINICIOS ---
socket.on('oponente-reinicio', () => {
  casillas.forEach((casilla, index) => {
    casilla.textContent = estadoInicial[index];
    casilla.classList.remove('seleccionada');
  });
  casillaOrigen = null;
  turnoActual = "blancas";
  juegoTerminado = false;
  indicadorTurno.textContent = "BLANCAS";
  cementerioBlancas.innerHTML = "";
  cementerioNegras.innerHTML = "";
  pantallaVictoria.classList.add('oculto');
  selectorBando.value = "espectador"; 
  bandoAsignado = "espectador";
  
  clearInterval(intervaloReloj);
  tiempoBlancas = 300;
  tiempoNegras = 300;
  txtTiempoBlancas.textContent = "05:00";
  txtTiempoNegras.textContent = "05:00";
  actualizarBrilloRelojes();
  partidaIniciada = false;
  btnIniciarPartida.classList.remove('oculto'); // Reaparece botón verde
  
  alert("La partida ha sido reiniciada.");
});

// --- 3. RECEPTOR DE CHAT MULTICOLOR ---
socket.on('recibir-mensaje', (datosRecibidos) => {
  const miApodoActual = entradaApodo.value.trim() || "Anónimo";
  const miBandoTexto = bandoAsignado === "blancas" ? "⚪" : (bandoAsignado === "negras" ? "⚫" : "👁️");
  const miFirmaCompleta = `${miBandoTexto} ${miApodoActual}`;

  if (datosRecibidos.remitente === miFirmaCompleta) {
    agregarMensajeAlCuadro(datosRecibidos, "yo");
  } else {
    agregarMensajeAlCuadro(datosRecibidos, "oponente");
  }
});

// --- 4. RECEPTOR DE EMPAREJAMIENTO AUTOMÁTICO Y GIRO ---
socket.on('actualizar-bandos-ocupados', (estadoBandos) => {
  const opcionBlancas = selectorBando.querySelector('option[value="blancas"]');
  const opcionNegras = selectorBando.querySelector('option[value="negras"]');

  if (estadoBandos.blancasOcupado) {
    opcionBlancas.textContent = bandoAsignado === "blancas" ? "Blancas (♙) - Tuyo" : "Blancas (♙) - Ocupado";
    if (bandoAsignado !== "blancas") opcionBlancas.disabled = true;
  } else {
    opcionBlancas.disabled = false;
    opcionBlancas.textContent = "Blancas (♙)";
  }

  if (estadoBandos.negrasOcupado) {
    opcionNegras.textContent = bandoAsignado === "negras" ? "Negras (♟) - Tuyo" : "Negras (♟) - Ocupado";
    if (bandoAsignado !== "negras") opcionNegras.disabled = true;
  } else {
    opcionNegras.disabled = false;
    opcionNegras.textContent = "Negras (♟)";
  }

  const elementoTablero = document.getElementById('tablero');
  if (bandoAsignado === "negras") {
    elementoTablero.classList.add('tablero-volteado'); 
  } else {
    elementoTablero.classList.remove('tablero-volteado');
  }
});

// --- 5. RECEPTOR CLAVE PARA ESPECTADORES Y SEGUNDOS JUGADORES QUE ENTRAN TARDE ---
socket.on('sincronizar-partida-espectador', (datos) => {
  console.log("¡Señal de sincronización recibida en el cliente!", datos);
  
  // Redibujar el tablero con la foto guardada en el servidor
  if (datos.tablero) {
    casillas.forEach((casilla, index) => {
      casilla.textContent = datos.tablero[index];
    });
  }
  
  // Sincronizar tiempos exactos del servidor
  tiempoBlancas = datos.tBlancas;
  tiempoNegras = datos.tNegras;
  txtTiempoBlancas.textContent = formatearTiempo(tiempoBlancas);
  txtTiempoNegras.textContent = formatearTiempo(tiempoNegras);
  
  // Sincronizar turno actual e interruptores de juego
  turnoActual = datos.turnoActual;
  indicadorTurno.textContent = turnoActual.toUpperCase();
  partidaIniciada = datos.partidaIniciada;

  // Si la partida ya había iniciado con el botón verde, escondemos el botón y prendemos el reloj
  if (partidaIniciada) {
    btnIniciarPartida.classList.add('oculto');
    iniciarSegundero();
  }
});

// --- 6. RECEPTOR PARA INICIAR EL TEMPORIZADOR AL MISMO TIEMPO ---
socket.on('servidor-inicio-partida', () => {
  partidaIniciada = true;
  btnIniciarPartida.classList.add('oculto'); 
  iniciarSegundero(); 
});


