const token_verifier = require('./tokenVerifier');

module.exports = (socketIo) => {
    socketIo.on('connection', (socket) => {
        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });

        const user_data = token_verifier(socket.handshake.query.token);
        
        if (!user_data) {
            return socket.disconnect(true);
        }
        
        console.log('New client connected', decodedToken.email);
        
        // gestione keepalive, per evitare che il server si riempia di socket che sono disconnessi
        // fondamentalmente ogni 5 minuti richiedi al client di mandare un messaggio
        // se non arriva entro 30 secondi, disconnetti il client
        const socket_killer = null;
        const killer_interval = setInterval(() => {
            socket_killer = setTimeout(_ => {
                clearInterval(killer_interval);
                socket.disconnect(true);
            }, 1000 * 30);
            socketIo.emit('keepalive'); // send keepalive request
        }, 1000 * 60 * 5);
        
        socket.on('keepalive', async (idToken) => {
            user_data = token_verifier(socket.handshake.query.token);
            if (user_data) {
                clearTimeout(socket_killer);
            } else {
                // invalid token, same as if the client didn't send keepalive
                clearInterval(killer_interval);
                socket.disconnect(true);
            }
        });
    });
}