// PARTE 1 DE 3: Variables, Lobby y Configuración del Chat

const socket = io();
const sonidoMover = new Audio('mover.mp3');
const sonidoRosa = new Audio('capturar.mp3'); 
let casillaOrigen = null;
let turnoActual = "blancas";
let juegoTerminado = false;
const entradaApodo = document.getElementById('entrada-apodo');

// --- CONTROL LÓGICO DE ENTRADA A SALAS (LOBBY) ---
const pantallaLobby = document.getElementById('pantalla-lobby');
const contenedorPrincipal = document.getElementById('contenedor-principal');
const entradaSala = document.getElementById('entrada-sala');
const btnEntrarSala = document.getElementById('btn-entrar-sala');

btnEntrarSala.addEventListener('click', () => {
  const nombreSala = entradaSala.value.trim().toLowerCase();
  
  if (nombreSala === "") {
    alert("Por favor, escribe un código para la sala.");
    return;
  }

  // 1. Ocultar la pantalla del lobby y mostrar el juego completo
  pantallaLobby.classList.add('oculto');
  contenedorPrincipal.classList.remove('oculto');

  // 2. Conectarse formalmente a la habitación digital en el servidor
  socket.emit('unirse-a-sala', nombreSala);
});

// Permitir entrar a la sala presionando también Enter en el teclado
entradaSala.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') btnEntrarSala.click();
});


// --- CAPTURAR ELEMENTOS DEL CHAT EN VIVO ---
const mensajesChat = document.getElementById('mensajes-chat');
const entradaMensaje = document.getElementById('entrada-mensaje');
const btnEnviarChat = document.getElementById('btn-enviar-chat');

// Función local para procesar el envío de un mensaje
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
  agregarMensajeAlCuadro(datos, "yo");
  socket.emit('enviar-mensaje', datos);
  entradaMensaje.value = "";
}

// Escuchar clics en el botón de la flecha o al presionar "Enter" en el teclado
btnEnviarChat.addEventListener('click', enviarMensajeTexto);
entradaMensaje.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') enviarMensajeTexto();
});

// Función para pintar la burbuja de texto dentro del contenedor
function agregarMensajeAlCuadro(datos, claseOrigen) {
  const div = document.createElement('div');
  div.classList.add('mensaje', claseOrigen);
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
const cementerioBlancas = document.getElementById('capturadas-blancas');
const cementerioNegras = document.getElementById('capturadas-negras');
const pantallaVictoria = document.getElementById('pantalla-victoria');
const mensajeGanador = document.getElementById('mensaje-ganador');

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
        
        // Enviamos el movimiento agregando la firma de quién lo originó
        socket.emit('movimiento-ajedrez', {
          fOri: fOri, cOri: cOri, fDes: fClick, cDes: cClick,
          bandoRemitente: bandoAsignado
        });
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


// ==========================================
// --- RECEPTORES INALÁMBRICOS DE SOCKETS ---
// ==========================================

// --- 1. RECEPTOR DE MOVIMIENTOS CON FILTRO ---
socket.on('oponente-movio', (datos) => {
  if (datos.bandoRemitente === bandoAsignado) return; // Filtro espejo (ignora jugada propia)
  moverPiezaEnPantalla(datos.fOri, datos.cOri, datos.fDes, datos.cDes);
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
  
  alert("La partida ha sido reiniciada.");
});

// --- 3. RECEPTOR DE CHAT CON FILTRO ---
socket.on('recibir-mensaje', (datosRecibidos) => {
  const miApodoActual = entradaApodo.value.trim() || "Anónimo";
  const miBandoTexto = bandoAsignado === "blancas" ? "⚪" : (bandoAsignado === "negras" ? "⚫" : "👁️");
  const miFirmaCompleta = `${miBandoTexto} ${miApodoActual}`;

  if (datosRecibidos.remitente === miFirmaCompleta) return; // Filtro espejo (ignora chat propio)
  agregarMensajeAlCuadro(datosRecibidos, "oponente");
});

// --- 4. RECEPTOR DE EMPAREJAMIENTO AUTOMÁTICO Y GIRO DE TABLERO ---
socket.on('actualizar-bandos-ocupados', (estadoBandos) => {
  const opcionBlancas = selectorBando.querySelector('option[value="blancas"]');
  const opcionNegras = selectorBando.querySelector('option[value="negras"]');

  if (estadoBandos.blancasOcupado && bandoAsignado !== "blancas") {
    opcionBlancas.disabled = true;
    opcionBlancas.textContent = "Piezas Blancas ⚪ (Ocupado)";
    
    if (bandoAsignado === "espectador" && !estadoBandos.negrasOcupado) {
      bandoAsignado = "negras";
      selectorBando.value = "negras";
      socket.emit('solicitar-bando', "negras");
    }
  } else {
    opcionBlancas.disabled = false;
    opcionBlancas.textContent = "Piezas Blancas ⚪";
  }

  if (estadoBandos.negrasOcupado && bandoAsignado !== "negras") {
    opcionNegras.disabled = true;
    opcionNegras.textContent = "Piezas Negras ⚫ (Ocupado)";
    
    if (bandoAsignado === "espectador" && !estadoBandos.blancasOcupado) {
      bandoAsignado = "blancas";
      selectorBando.value = "blancas";
      socket.emit('solicitar-bando', "blancas");
    }
  } else {
    opcionNegras.disabled = false;
    opcionNegras.textContent = "Piezas Negras ⚫";
  }

    // LÓGICA DEL GIRO AUTOMÁTICO DE CÁMARA
  const elementoTablero = document.getElementById('tablero');
  if (bandoAsignado === "negras") {
    elementoTablero.classList.add('tablero-volteado'); 
  } else {
    elementoTablero.classList.remove('tablero-volteado');
  }
}); // Fin de la antena
