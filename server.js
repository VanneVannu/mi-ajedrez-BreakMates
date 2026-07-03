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
  
  // Guardamos el nombre de la sala directamente en una variable interna del socket del jugador
  socket.miSalaActual = null; 

  // --- 1. Escuchar cuando un jugador se une a una sala específica ---
  socket.on('unirse-a-sala', (nombreSala) => {
    socket.miSalaActual = nombreSala; 
    socket.join(nombreSala); // Meter al jugador a la habitación digital oficial

    if (!salasOcupadas[nombreSala]) {
      salasOcupadas[nombreSala] = { blancas: null, negras: null };
    }

    // Informar de inmediato cómo están los bandos en su sala específica
    io.to(nombreSala).emit('actualizar-bandos-ocupados', {
      blancasOcupado: salasOcupadas[nombreSala].blancas !== null,
      negrasOcupado: salasOcupadas[nombreSala].negras !== null
    });
    
    console.log(`Usuario ${socket.id} entró con éxito a la sala: ${nombreSala}`);
  });

  // --- 2. Escuchar cuando alguien reclama un bando dentro de su sala ---
  socket.on('solicitar-bando', (bandoElegido) => {
    const salaNombre = socket.miSalaActual;
    if (!salaNombre || !salasOcupadas[salaNombre]) return;

    let sala = salasOcupadas[salaNombre];

    // Liberar bando anterior en esta sala si este jugador ya tenía uno
    if (sala.blancas === socket.id) sala.blancas = null;
    if (sala.negras === socket.id) sala.negras = null;

    // Asignar el nuevo bando limpiamente
    if (bandoElegido === 'blancas' && sala.blancas === null) {
      sala.blancas = socket.id;
    } else if (bandoElegido === 'negras' && sala.negras === null) {
      sala.negras = socket.id;
    }

    // Avisar a TODOS los miembros de esta sala en específico usando io.to
    io.to(salaNombre).emit('actualizar-bandos-ocupados', {
      blancasOcupado: sala.blancas !== null,
      negrasOcupado: sala.negras !== null
    });
  });

  // --- 3. CORREGIDO: Retransmitir movimientos de forma infalible con io.to ---
  socket.on('movimiento-ajedrez', (datosMovimiento) => {
    if (socket.miSalaActual) {
      io.to(socket.miSalaActual).emit('oponente-movio', datosMovimiento);
    }
  });

  // --- 4. CORREGIDO: Retransmitir reinicios de forma infalible con io.to ---
  socket.on('solicitar-reinicio', () => {
    if (socket.miSalaActual) {
      io.to(socket.miSalaActual).emit('oponente-reinicio');
    }
  });

  // --- 5. CORREGIDO: Retransmitir mensajes del chat de forma infalible con io.to ---
  socket.on('enviar-mensaje', (datosMensaje) => {
    if (socket.miSalaActual) {
      io.to(socket.miSalaActual).emit('recibir-mensaje', datosMensaje);
    }
  });

  // --- 6. Si se desconecta, liberamos su bando de su sala específica ---
  socket.on('disconnect', () => {
    const salaNombre = socket.miSalaActual;
    
    if (salaNombre && salasOcupadas[salaNombre]) {
      let sala = salasOcupadas[salaNombre];
      if (sala.blancas === socket.id) sala.blancas = null;
      if (sala.negras === socket.id) sala.negras = null;

      // Notificar los cambios a los que se quedaron en la sala
      io.to(salaNombre).emit('actualizar-bandos-ocupados', {
        blancasOcupado: sala.blancas !== null,
        negrasOcupado: sala.negras !== null
      });

      // Si la sala quedó completamente vacía, la borramos para ahorrar memoria
      const clientesEnSala = io.sockets.adapter.rooms.get(salaNombre);
      if (!clientesEnSala || clientesEnSala.size === 0) {
        delete salasOcupadas[salaNombre];
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

