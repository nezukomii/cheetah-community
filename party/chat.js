export default {
    onConnect(conn, room) {
      // Al conectarse un nuevo usuario, lo guardamos en la sala
      const user = conn.uri.searchParams.get("user") || "Anónimo";
      conn.state = { user };
  
      // Informar a todos que alguien se unió
      room.broadcast(JSON.stringify({ type: 'system', message: `${user} se ha unido.` }));
  
      // Enviar la lista de usuarios actuales al nuevo miembro
      const users = Array.from(room.connections.values()).map(c => c.state.user);
      conn.send(JSON.stringify({ type: 'user_list', users }));
      // Actualizar la lista para todos
      room.broadcast(JSON.stringify({ type: 'user_list', users }));
    },
  
    onMessage(message, conn, room) {
      const user = conn.state.user;
      const msgData = JSON.parse(message);
  
      // Adjuntar la info del usuario al mensaje y retransmitirlo a todos
      const fullMessage = {
        ...msgData,
        user,
        id: crypto.randomUUID(),
        timestamp: Date.now()
      };
      room.broadcast(JSON.stringify(fullMessage));
  
      /**
       * LÓGICA DE OPTIMIZACIÓN DE BD (para implementar):
       * Aquí es donde guardarías el 'fullMessage' en D1 para usuarios offline.
       * Luego, un Cron Trigger eliminaría mensajes antiguos o ya entregados.
       */
    },
  
    onClose(conn, room) {
      const user = conn.state.user;
      // Informar a todos que alguien se fue y actualizar la lista de usuarios
      room.broadcast(JSON.stringify({ type: 'system', message: `${user} se ha ido.` }));
      const users = Array.from(room.connections.values()).map(c => c.state.user);
      room.broadcast(JSON.stringify({ type: 'user_list', users }));
    },
  };