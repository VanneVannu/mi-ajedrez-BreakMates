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

// --- NUEVO: Ruta explícita para entregar el favicon sin bloqueos ---
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'favicon.ico'));
});


// Lógica de conexión en tiempo real
// --- NUEVO: Control global estructurado por Salas ---
// Guardará la información de cada sala de esta forma: { 'sala1': { blancas: id, negras: id } }
let salasOcupadas = {}; 

io.on('connection', (socket) => {
  console.log('¡Usuario conectado! ID:', socket.id);
  
  // Guardamos en qué sala se encuentra este dispositivo de manera local en su sesión de red
  let miSalaActual = null; 

  // --- NUEVO: Escuchar cuando un jugador se une a una sala específica ---
  socket.on('unirse-a-sala', (nombreSala) => {
    miSalaActual = nombreSala;
    socket.join(nombreSala); // Comando oficial de Socket.io para meterlo a la habitación digital

    // Si la sala no existe en nuestro registro, la creamos vacía
    if (!salasOcupadas[nombreSala]) {
      salasOcupadas[nombreSala] = { blancas: null, negras: null };
    }

    // Le avisamos de inmediato a este jugador específico cómo están los bandos EN SU SALA
    socket.emit('actualizar-bandos-ocupados', {
      blancasOcupado: salasOcupadas[nombreSala].blancas !== null,
      negrasOcupado: salasOcupadas[nombreSala].negras !== null
    });
    
    console.log(`Usuario ${socket.id} entró con éxito a la sala: ${nombreSala}`);
  });

  // --- MODIFICADO: Escuchar cuando alguien reclama un bando dentro de su sala ---
  socket.on('solicitar-bando', (bandoElegido) => {
    if (!miSalaActual || !salasOcupadas[miSalaActual]) return;

    let sala = salasOcupadas[miSalaActual];

    // Liberar bando anterior en esta sala si ya tenía uno
    if (sala.blancas === socket.id) sala.blancas = null;
    if (sala.negras === socket.id) sala.negras = null;

    // Asignar el nuevo bando si está libre
    if (bandoElegido === 'blancas' && sala.blancas === null) {
      sala.blancas = socket.id;
    } else if (bandoElegido === 'negras' && sala.negras === null) {
      sala.negras = null; // corrección lógica interna
      sala.negras = socket.id;
    }

    // Avisar ÚNICAMENTE a los que estén dentro de esta misma sala (.to)
    io.to(miSalaActual).emit('actualizar-bandos-ocupados', {
      blancasOcupado: sala.blancas !== null,
      negrasOcupado: sala.negras !== null
    });
  });

  // --- MODIFICADO: Retransmitir movimientos SOLO a los miembros de la misma sala ---
  socket.on('movimiento-ajedrez', (datosMovimiento) => {
    if (miSalaActual) {
      socket.to(miSalaActual).emit('oponente-movio', datosMovimiento);
    }
  });

  // --- MODIFICADO: Retransmitir reinicios SOLO a la misma sala ---
  socket.on('solicitar-reinicio', () => {
    if (miSalaActual) {
      socket.to(miSalaActual).emit('oponente-reinicio');
    }
  });

  // --- MODIFICADO: Retransmitir mensajes del chat SOLO a la misma sala ---
  socket.on('enviar-mensaje', (datosMensaje) => {
    if (miSalaActual) {
      socket.to(miSalaActual).emit('recibir-mensaje', datosMensaje);
    }
  });

  // --- MODIFICADO: Si se desconecta, liberamos su bando de su sala específica ---
  socket.on('disconnect', () => {
    if (miSalaActual && salasOcupadas[miSalaActual]) {
      let sala = salasOcupadas[miSalaActual];
      if (sala.blancas === socket.id) sala.blancas = null;
      if (sala.negras === socket.id) sala.negras = null;

      // Avisar a los que se quedaron en la sala
      socket.to(miSalaActual).emit('actualizar-bandos-ocupados', {
        blancasOcupado: sala.blancas !== null,
        negrasOcupado: sala.negras !== null
      });

      // Limpieza: Si la sala quedó completamente vacía, la borramos de la memoria del servidor
      const clientesEnSala = io.sockets.adapter.rooms.get(miSalaActual);
      if (!clientesEnSala || clientesEnSala.size === 0) {
        delete salasOcupadas[miSalaActual];
      }
    }
    console.log('Un jugador se ha desconectado.', socket.id);
  });
});


// Arrancar el servidor en el puerto 3000
const PUERTO = 3000;
server.listen(PUERTO, () => {
  console.log(`Servidor de ajedrez corriendo en http://localhost:${PUERTO}`);
});
