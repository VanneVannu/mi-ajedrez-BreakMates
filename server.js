// Importar las librerías necesarias
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- NUEVO: Control global de bandos ocupados en el servidor ---
let idJugadorBlancas = null;
let idJugadorNegras = null;


// Indicarle al servidor que comparta públicamente nuestros archivos visuales
app.use(express.static(__dirname));

// --- NUEVO: Ruta explícita para entregar el favicon sin bloqueos ---
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'favicon.ico'));
});


// Lógica de conexión en tiempo real
io.on('connection', (socket) => {
  console.log('¡Un jugador se ha conectado! ID:', socket.id);

  // Escuchar cuando un jugador hace un movimiento en su pantalla
  socket.on('movimiento-ajedrez', (datosMovimiento) => {
    console.log('Movimiento recibido en servidor:', datosMovimiento);
    
    // Retransmitir el movimiento a TODOS los demás jugadores conectados
    socket.broadcast.emit('oponente-movio', datosMovimiento);
  });

  // Detectar cuando alguien cierra la pestaña
  socket.on('disconnect', () => {
    console.log('Un jugador se ha desconectado.', socket.id);
  });

    // --- NUEVO: Escuchar cuando un jugador pide reiniciar la partida ---
  socket.on('solicitar-reinicio', () => {
    console.log('Solicitud de reinicio recibida. Retransmitiendo al oponente...');
    // Avisar a todos los demás jugadores que deben limpiar su tablero
    socket.broadcast.emit('oponente-reinicio');
  });

    // --- NUEVO: Escuchar mensajes del chat y retransmitirlos ---
  socket.on('enviar-mensaje', (datosMensaje) => {
    // Reenviar el mensaje de texto a las demás pantallas conectadas
    socket.broadcast.emit('recibir-mensaje', datosMensaje);
  });

    // --- NUEVO: Cuando un jugador entra, le avisamos qué bandos están ocupados ---
  socket.emit('actualizar-bandos-ocupados', {
    blancasOcupado: idJugadorBlancas !== null,
    negrasOcupado: idJugadorNegras !== null
  });

  // --- NUEVO: Escuchar cuando alguien reclama un bando ---
  socket.on('solicitar-bando', (bandoElegido) => {
    // Liberar bando anterior si este jugador ya tenía uno
    if (idJugadorBlancas === socket.id) idJugadorBlancas = null;
    if (idJugadorNegras === socket.id) idJugadorNegras = null;

    // Asignar el nuevo bando si está libre
    if (bandoElegido === 'blancas' && idJugadorBlancas === null) {
      idJugadorBlancas = socket.id;
    } else if (bandoElegido === 'negras' && idJugadorNegras === null) {
      idJugadorNegras = socket.id;
    }

    // Avisar a TODOS los conectados para que actualicen sus menús desplegables
    io.emit('actualizar-bandos-ocupados', {
      blancasOcupado: idJugadorBlancas !== null,
      negrasOcupado: idJugadorNegras !== null
    });
  });

  // --- NUEVO: Si un jugador se desconecta, liberamos su bando ---
  socket.on('disconnect', () => {
    if (idJugadorBlancas === socket.id) idJugadorBlancas = null;
    if (idJugadorNegras === socket.id) idJugadorNegras = null;

    // Notificar el cambio a las pantallas que queden conectadas
    socket.broadcast.emit('actualizar-bandos-ocupados', {
      blancasOcupado: idJugadorBlancas !== null,
      negrasOcupado: idJugadorNegras !== null
    });
    console.log('Un jugador se ha desconectado.', socket.id);
  });


});

// Arrancar el servidor en el puerto 3000
const PUERTO = 3000;
server.listen(PUERTO, () => {
  console.log(`Servidor de ajedrez corriendo en http://localhost:${PUERTO}`);
});
