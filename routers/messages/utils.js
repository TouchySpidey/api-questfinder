const { statuses } = require('../../constants');
const { getUsersInOneshot } = require('../oneshot/utils');
const { v4: uuidv4 } = require('uuid');

module.exports.messageToDB = async (sender, receiverType, receiverUID, message) => {
    const UID = uuidv4();
    global.db.execute('INSERT INTO messages (UID, senderUID, receiverType, receiverUID, content, sentOn) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())', [UID, sender.UID ?? null, receiverType, receiverUID, message]);
    if (receiverType === 'USER') {
        // send socket message to both sender and receiver
        const messageBodyForSocket = {
            messageUID: UID,
            chatType: receiverType,
            senderUID: sender.UID ?? null, // could be a system message
            nickname: sender.nickname,
            content: message
        };
        global.sendSocketMessage(receiverUID, 'message', {
            ...messageBodyForSocket,
            chatId: sender.UID
        });
        global.sendSocketMessage(sender.UID, 'message', {
            ...messageBodyForSocket,
            chatId: receiverUID
        });
    } else if (receiverType === 'ONESHOT') {
        // send socket message to all users in the oneshot
        const messageBodyForSocket = {
            messageUID: UID,
            chatType: receiverType,
            chatId: receiverUID,
            senderUID: sender.UID,
            nickname: sender.nickname,
            content: message
        };
        const usersInOneshot = await getUsersInOneshot(receiverUID);
        usersInOneshot.forEach(user => {
            if (user.isIn) {
                global.sendSocketMessage(user.UID, 'message', messageBodyForSocket);
            }
        });
    }
}

module.exports.chatView = (userUID, chatType, chatId) => {
    global.db.execute('REPLACE INTO chat_views VALUES (?, ?, ?, UTC_TIMESTAMP())', [ userUID, chatType, chatId ]);
}

module.exports.lastViewForChat = async (userUID, chatType, chatId) => {
    const [ rows ] = await global.db.execute('SELECT lastViewed FROM chat_views WHERE userUID = ? AND chatType = ? AND chatId = ?', [ userUID, chatType, chatId ]);
    if (rows.length === 0) {
        return '0000-00-00T00:00:00.000Z';
    }
    return rows[0].lastViewed;
}

module.exports.listMessages = async (chatType, interlocutorUID, userUID) => {
    let messagesRows;
    if (chatType === 'USER') {
        const sql = `SELECT
        messages.UID, receiverType AS chatType, messages.content,
        messages.sentOn, messages.senderUID, users.nickname
        FROM messages
        LEFT JOIN users ON messages.senderUID = users.UID
        WHERE receiverType = ? AND (
            (receiverUID = ? AND senderUID = ?)
            OR
            (receiverUID = ? AND senderUID = ?)
        )
        ORDER BY sentOn ASC `;
        [ messagesRows ] = await global.db.execute(sql, [chatType, userUID, interlocutorUID, interlocutorUID, userUID]);
    } else if (chatType === 'ONESHOT') {
        const sql = `SELECT
        messages.UID, receiverType AS chatType, messages.content,
        messages.sentOn, messages.senderUID, users.nickname, masterUID
        FROM messages
        LEFT JOIN oneshots ON messages.receiverUID = oneshots.UID
        LEFT JOIN join_requests ON oneshots.UID = join_requests.oneshotUID AND join_requests.userUID = ?
        LEFT JOIN users ON messages.senderUID = users.UID
        WHERE receiverType = ? AND receiverUID = ?
        AND (
            masterUID = ?
            OR
            (join_requests.status = ?)
            OR
            (join_requests.status IN (?, ?) AND join_requests.updatedOn > messages.sentOn)
        )
        ORDER BY sentOn ASC`;
        [ messagesRows ] = await global.db.execute(sql, [userUID, chatType, interlocutorUID, userUID, statuses.ACCEPTED, statuses.KICKED, statuses.LEFT]);
    }
    return mapMessages(messagesRows, userUID);
}

function mapMessages(messagesRows, userUID) {
    return messagesRows.map(message => {
        if (message.senderUID === userUID) {
            message.isMine = true;
        } else {
            message.isMine = false;
        }
        if (message.senderUID === null) {
            message.sender = 'system';
            message.senderUID = 'SYSTEM';
            message.isSystem = true;
        } else {
            message.isSystem = false;
            if (message.nickname === null) {
                message.nickname = '[deleted]';
            }
        }
        if (message.chatType === 'ONESHOT') {
            if (message.masterUID === userUID) {
                message.isMaster = true;
            } else {
                message.isMaster = false;
            }
        }
        return message;
    });
}

module.exports.listChats = async (userUID) => {
    // get the most recent message for each chat the user is involved in
    const privateChatsQuery = `SELECT messages.UID, messages.receiverType AS chatType, messages.content,
    lastMessageDT, messages.senderUID, sender.nickname, chatID, chat.nickname as chatName
    FROM (
        
        SELECT IF(receiverUID = ?, senderUID, receiverUID) AS chatID, MAX(sentOn) AS lastMessageDT
        FROM messages
        WHERE receiverType = 'USER'
        AND ? IN (messages.senderUID, messages.receiverUID)
        GROUP BY chatID
        
    ) privateChats
    JOIN messages
    ON privateChats.lastMessageDT = messages.sentOn
    AND messages.receiverType = 'USER'
    AND chatID IN (messages.senderUID, messages.receiverUID)
    AND ? IN (messages.senderUID, messages.receiverUID)
    LEFT JOIN users sender ON sender.UID = messages.senderUID
    LEFT JOIN users chat ON chat.UID = chatID`;
    const [ privateChats ] = await global.db.execute(privateChatsQuery, [ userUID, userUID, userUID ]);
    
    const groupChatsQuery = `SELECT messages.UID, messages.receiverType AS chatType, messages.content,
    lastMessageDT, messages.senderUID, sender.nickname, chatID, masterUID, oneshots.title AS chatName
    FROM (
        SELECT messages.receiverUID AS chatID, MAX(sentOn) AS lastMessageDT
        FROM messages
        JOIN oneshots myo ON messages.receiverUID = myo.UID
        LEFT JOIN join_requests jr ON myo.UID = jr.oneshotUID AND jr.userUID = ?
        WHERE messages.receiverType = 'ONESHOT'
        AND (
            myo.masterUID = ?
            OR (
                jr.status = ? -- 2 = ACCEPTED
            )
            OR (
                jr.status IN (?, ?) -- 5 = KICKED, 6 = LEFT
                AND jr.updatedOn > messages.sentOn
            )
        )
        GROUP BY messages.receiverUID
    ) groupChats
    JOIN messages ON groupChats.lastMessageDT = messages.sentOn
    AND messages.receiverType = 'ONESHOT' AND receiverUID = chatID
    LEFT JOIN oneshots ON oneshots.UID = chatID
    LEFT JOIN users sender ON sender.UID = messages.senderUID`;
    const [ groupChats ] = await global.db.execute(groupChatsQuery, [ userUID, userUID, statuses.ACCEPTED, statuses.KICKED, statuses.LEFT ]);
    const chats = mapMessages(privateChats, userUID).concat(mapMessages(groupChats, userUID));
    chats.sort((a, b) => {
        return b.lastMessageDT - a.lastMessageDT;
    });
    
    return chats;
}