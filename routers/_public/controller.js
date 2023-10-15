const express = require('express');
const router = express.Router();
const { validateQuery, getList } = require.main.require('./routers/oneshot/utils');

router.get('/oneshot/list', async (req, res) => {
    try {
        const validatedQuery = validateQuery(req.query);
        if (!validatedQuery) {
            return res.status(400).send("Invalid query");
        }
    
        const list = await getList(validatedQuery);
    
        res.status(200).send({ list });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

router.get('/user/:UID', async (req, res) => {
    try {
        const { UID } = req.params;
        const [usersRow] = await global.db.execute('SELECT * FROM users WHERE UID = ?', [UID]);
        if (usersRow.length === 0) {
            return res.status(404).send('User Not Found');
        }
        const user = usersRow[0];
        return res.status(200).json({
            UID: user.UID,
            nickname: user.nickname,
            bio: user.bio,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
