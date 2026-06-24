const socket = io();
const sonidoMover = new Audio('mover.mp3');
const sonidoRosa = new Audio('capturar.mp3'); 
let casillaOrigen = null;
let turnoActual = "blancas";
let juegoTerminado = false;
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
function verificarCoronacion(casilla, fila, pieza) {
  if ((pieza === "♙" && fila === 0) || (pieza === "♟" && fila === 7)) {
    let seleccion = "";
    const opcionesValidas = ["reina", "torre", "alfil", "caballo"];
    while (!opcionesValidas.includes(seleccion)) {
      seleccion = prompt("¡Peón coronado! Elige: reina, torre, alfil o caballo").toLowerCase().trim();
    }
    if (pieza === "♙") {
      if (seleccion === "reina") casilla.textContent = "♕";
      if (seleccion === "torre") casilla.textContent = "♖";
      if (seleccion === "alfil") casilla.textContent = "♗";
      if (seleccion === "caballo") casilla.textContent = "♘";
    } else {
      if (seleccion === "reina") casilla.textContent = "♛";
      if (seleccion === "torre") casilla.textContent = "♜";
      if (seleccion === "alfil") casilla.textContent = "♝";
      if (seleccion === "caballo") casilla.textContent = "♞";
    }
  }
}
function moverPiezaEnPantalla(fOri, cOri, fDes, cDes) {
  const cOrigenNodo = document.querySelector(`[data-fila="${fOri}"][data-col="${cOri}"]`);
  const cDestinoNodo = document.querySelector(`[data-fila="${fDes}"][data-col="${cDes}"]`);
  const pOrigen = cOrigenNodo.textContent;
  const pDestino = cDestinoNodo.textContent;
  if (pDestino !== "") {
    sonidoRosa.currentTime = 0; 
    sonidoRosa.play().catch(e => console.log("Audio bloqueado"));
  } else {
    sonidoMover.currentTime = 0;
    sonidoMover.play().catch(e => console.log("Audio bloqueado"));
  }
  if (pDestino !== "") {
    const elementoPiezaCaida = document.createElement('div');
    elementoPiezaCaida.textContent = pDestino;
    if (piezasBlancas.includes(pDestino)) cementerioBlancas.appendChild(elementoPiezaCaida);
    else if (piezasNegras.includes(pDestino)) cementerioNegras.appendChild(elementoPiezaCaida);
  }
  cDestinoNodo.textContent = pOrigen;
  cOrigenNodo.textContent = "";
  if (pOrigen === "♙" || pOrigen === "♟") verificarCoronacion(cDestinoNodo, fDes, pOrigen);
  if (pDestino !== "") verificarFinDePartido(pDestino);
  if (!juegoTerminado) {
    turnoActual = (turnoActual === "blancas") ? "negras" : "blancas";
    indicadorTurno.textContent = turnoActual.toUpperCase();
  }
}
casillas.forEach(casilla => {
  casilla.addEventListener('click', () => {
    if (juegoTerminado) return;
    if (casillaOrigen === null) {
      const pieza = casilla.textContent;
      if (pieza !== "") {
        if ((turnoActual === "blancas" && piezasBlancas.includes(pieza)) || (turnoActual === "negras" && piezasNegras.includes(pieza))) {
          casillaOrigen = casilla;
          casilla.classList.add('seleccionada');
        } else alert("¡No es tu turno! Mueven: " + turnoActual);
      }
    } else {
      if (casillaOrigen === casilla) {
        casillaOrigen.classList.remove('seleccionada');
        casillaOrigen = null;
      } else {
        const fOrigen = parseInt(casillaOrigen.getAttribute('data-fila'));
        const cOrigen = parseInt(casillaOrigen.getAttribute('data-col'));
        const fDestino = parseInt(casilla.getAttribute('data-fila'));
        const cDestino = parseInt(casilla.getAttribute('data-col'));
        const piezaOrigen = casillaOrigen.textContent;
        const piezaDestino = casilla.textContent;
        const esCasillaVacia = (piezaDestino === "");
        if (!esCasillaVacia) {
          const esAliadoBlanco = piezasBlancas.includes(piezaOrigen) && piezasBlancas.includes(piezaDestino);
          const esAliadoNegro = piezasNegras.includes(piezaOrigen) && piezasNegras.includes(piezaDestino);
          if (esAliadoBlanco || esAliadoNegro) {
            alert("Movimiento inválido: No puedes comer tus propias piezas.");
            return;
          }
        }
        let movimientoValido = false;
        if (piezaOrigen === "♙" || piezaOrigen === "♟") movimientoValido = validarMovimientoPeon(fOrigen, cOrigen, fDestino, cDestino, piezaOrigen, esCasillaVacia);
        else if (piezaOrigen === "♖" || piezaOrigen === "♜") movimientoValido = validarMovimientoTorre(fOrigen, cOrigen, fDestino, cDestino);
        else if (piezaOrigen === "♗" || piezaOrigen === "♝") movimientoValido = validarMovimientoAlfil(fOrigen, cOrigen, fDestino, cDestino);
        else if (piezaOrigen === "♘" || piezaOrigen === "♞") movimientoValido = validarMovimientoCaballo(fOrigen, cOrigen, fDestino, cDestino);
        else if (piezaOrigen === "♕" || piezaOrigen === "♛") movimientoValido = validarMovimientoTorre(fOrigen, cOrigen, fDestino, cDestino) || validarMovimientoAlfil(fOrigen, cOrigen, fDestino, cDestino);
        else if (piezaOrigen === "♔" || piezaOrigen === "♚") movimientoValido = validarMovimientoRey(fOrigen, cOrigen, fDestino, cDestino);
        if (!movimientoValido) {
          alert("Movimiento inválido para esta pieza.");
          return;
        }
        socket.emit('movimiento-ajedrez', { fOri: fOrigen, cOri: cOrigen, fDes: fDestino, cDes: cDestino });
        casillaOrigen.classList.remove('seleccionada');
        moverPiezaEnPantalla(fOrigen, cOrigen, fDestino, cDestino);
        casillaOrigen = null;
      }
    }
  });
});
socket.on('oponente-movio', (datos) => moverPiezaEnPantalla(datos.fOri, datos.cOri, datos.fDes, datos.cDes));
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
  alert("El oponente ha reiniciado la partida.");
});

