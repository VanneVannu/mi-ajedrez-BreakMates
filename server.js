// Importar las librerías necesarias
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Indicarle al servidor que comparta públicamente nuestros archivos visuales
app.use(express.static(__dirname));

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

});

// Arrancar el servidor en el puerto 3000
const PUERTO = 3000;
server.listen(PUERTO, () => {
  console.log(`Servidor de ajedrez corriendo en http://localhost:${PUERTO}`);
});
