const tokenVerifier = require('./tokenVerifier');
const { v4: uuidv4 } = require('uuid');
const { chatView } = global.projectUtils;

global.userSockets = {};

module.exports = (socketIo) => {
    try {
        socketIo.on('connection', async (socket) => {
            const userData = await tokenVerifier(socket.handshake.query.token);
            const { firebaseUID } = userData;
            const userUID = firebaseUID ? await getUserUIDFromFirebaseUID(firebaseUID) : null;
            const socketUID = userUID ? uuidv4() : null;

            socket.on('disconnect', () => {
                if (userUID in global.userSockets) {
                    if (socketUID in global.userSockets[userUID]) {
                        delete global.userSockets[userUID][socketUID];
                        if (Object.keys(global.userSockets[userUID]).length === 0) delete global.userSockets[userUID];
                    }
                }
            })
            
            if (!userUID) {
                return socket.disconnect(true);;
            }
        
            if (!(userUID in global.userSockets)) {
                global.userSockets[userUID] = {};
            }
            global.userSockets[userUID][socketUID] = socket;

            socket.on('chat-view', async (body) => {
                if (body && typeof body === 'object') {
                    const { chatType, chatId } = body;
                    if (chatType && chatId) {
                        chatView(userUID, chatType, chatId);
                    }
                }
            })
        });
    } catch (e) {
        console.log(e);
    }
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

async function getUserUIDFromFirebaseUID(firebaseUID = null) {
    if (!firebaseUID) {
        return false;
    }
    const [rows] = await global.db.execute('SELECT * FROM users WHERE firebaseUid = ?', [firebaseUID]);
    if (rows.length === 0) {
        return false;
    }
    return rows[0].UID;
}
