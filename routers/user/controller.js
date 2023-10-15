const express = require('express');
const router = express.Router();

const messages = require.main.require('./routers/messages/utils');

router.get('/info', (req, res) => {
    const { user } = req;
    res.status(200).json({
        new: user.new ?? false,
        nickname: user.nickname,
    });
});

router.get('/view/:UID', async (req, res) => {
    const { user } = req;
    const { UID } = req.params;
    const [userRows] = await global.db.execute('SELECT * FROM users WHERE UID = ?', [UID]);
    if (!userRows.length) {
        return res.status(404).send('User Not Found');
    }
    const userRow = userRows[0];
    // const [oneshotsTogetherRow] = await global.db.execute(
    const oneshotsTogetherRow = [];
    const [oneshotsRow] = await global.db.execute('SELECT * FROM oneshots WHERE masterUID = ?', [UID]);
    res.status(200).json({
        nickname: userRow.nickname,
        bio: userRow.bio,
        signedUpOn: userRow.signedUpOn,
        oneshots: oneshotsRow
    });
});

router.post('/update', async (req, res) => {
    try {
        const validatedInput = validateInput(res, req.body);
        if (!validatedInput) return;
        const { user } = req;

        const connection = await global.db.getConnection();
        await connection.beginTransaction();

        const [userRow] = await connection.execute('SELECT * FROM users WHERE UID = ?', [user.UID]);
        if (!userRow.length) {
            return res.status(404).send('User Not Found');
        }
        const userDb = userRow[0];
        
        if (validatedInput.nickname) {
            await connection.execute('UPDATE users SET nickname = ?, updatedOn = UTC_TIMESTAMP() WHERE UID = ?', [ validatedInput.nickname, userDb.UID ]);
            await connection.execute('INSERT akas (userUID, nickname, since, until) VALUES (?, ?, ?, UTC_TIMESTAMP())', [ userDb.UID, userDb.nickname, userDb.createdOn ]);
        }

        if (validatedInput.bio) {
            await connection.execute('UPDATE users SET bio = ?, updatedOn = UTC_TIMESTAMP() WHERE UID = ?', [validatedInput.bio, userDb.UID]);
        }

        if (validatedInput.email) {
            await connection.execute('UPDATE users SET email = ?, updatedOn = UTC_TIMESTAMP() WHERE UID = ?', [validatedInput.email, userDb.UID]);
        }
        
        await connection.commit();
        res.status(200).send('OK');
    } catch (error) {
        await connection.rollback();
        console.error(error);
        return res.status(500).send('Internal Server Error');
    } finally {
        connection.release();
    }
});

// messages
router.post('/message/:userUID', (req, res) => {
    try {
        const { user } = req;
        const receiverType = 'USER';
        const receiverUID = req.params.userUID;
        const { message } = req.body;
        messages.messageToDB(user.UID, receiverType, receiverUID, message);
        res.status(200).send('Message sent');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});
router.get('/messages/:userUID', async (req, res) => {
    try {
        const { user } = req;
        const receiverUID = req.params.userUID;
        const messagesRows = await messages.listMessages('USER', receiverUID, user.UID);
        res.status(200).json(messagesRows);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});
router.get('/chats', async (req, res) => {
    try {
        const { user } = req;
        const chats = await messages.listChats(user.UID);
        res.status(200).json(chats);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});

function validateInput(res, inputToValidate) {
    const { nickname, bio, email } = inputToValidate;
    if (nickname && nickname.length > 50) {
        res.status(400).send('Username too long');
        return false;
    }
    if (bio && bio.length > 1000) {
        res.status(400).send('Bio too long');
        return false;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).send('Email too long');
        return false;
    }
    return inputToValidate;
}

module.exports = router;
