const token_verifier = require('./tokenVerifier');
const { v4: uuidv4 } = require('uuid');

global.userSockets = {};

module.exports = (socketIo) => {
    try {
        socketIo.on('connection', async (socket) => {
            socket.on('disconnect', () => {
                console.log('Client disconnected');
            });
    
            const userData = await token_verifier(socket.handshake.query.token);
            
            if (!userData) {
                return socket.disconnect(true);
            }
            console.log(userData);
            
            const { firebaseUID, email } = userData;
            console.log('New client connected', email);
            const userUID = await getUserUIDFromFirebaseUID(firebaseUID);
            console.log(firebaseUID, userUID);
            if (!userUID) {
                return socket.disconnect(true);
            }
        
            const socketUID = uuidv4();
            if (!(userUID in global.userSockets)) {
                global.userSockets[userUID] = {};
            }
            global.userSockets[userUID][socketUID] = socket;
            console.log(global.userSockets);
            
            // gestione keepalive, per evitare che il server si riempia di socket che sono disconnessi
            let actualKiller = null;
            const killingCheck = setInterval(() => {
                // ogni 5 minuti richiedi al client di mandare un messaggio
                // se non arriva entro 30 secondi, disconnetti il client
                actualKiller = setTimeout(_ => killSocket(killingCheck, userUID, socketUID, socket), 1000 * 3);
                socket.emit('keepalive');
                console.log('keepalive request sent')
            }, 1000 * 1 * 8);
            
            socket.on('keepalive', async (accessToken) => {
                console.log('keepalive response received');
                const checkRefresh = await token_verifier(accessToken);
                if (checkRefresh) {
                    clearTimeout(actualKiller);
                } else {
                    // invalid token, same as if the client didn't send keepalive
                    killSocket(killingCheck, userUID, socketUID, socket)
                }
            });
        });
    } catch (e) {
        console.log(e);
    }
}

function killSocket(killingCheck, userUID, socketUID, socket) {
    console.log('Killing socket', userUID, socketUID);
    clearInterval(killingCheck);
    socket.disconnect(true);
    delete global.userSockets[userUID][socketUID];
    if (Object.keys(global.userSockets[userUID]).length === 0) {
        delete global.userSockets[userUID];
    }
    console.log(global.userSockets);
}

global.sendSocketMessage = (userUID, type, body) => {
    // check if userUID is in global.userSockets
    if (!(userUID in global.userSockets)) {
        return;
    }
    // send message
    for (let socketUID in global.userSockets[userUID]) {
        global.userSockets[userUID][socketUID].emit(type, body);
    }
}

async function getUserUIDFromFirebaseUID(firebaseUID) {
    console.log(firebaseUID);
    const [rows] = await global.db.execute('SELECT * FROM users WHERE firebaseUid = ?', [firebaseUID]);
    if (rows.length === 0) {
        return false;
    }
    return rows[0].UID;
}