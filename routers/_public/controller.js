const express = require('express');
const router = express.Router();
const { validateQuery, buildQuery } = require.main.require('./routers/oneshot/utils');

router.get('/oneshot/list', async (req, res) => {
    const validatedQuery = validateQuery(req.query);
    if (!validatedQuery) {
        return res.status(400).send("Invalid query");
    }

    const query = buildQuery(validatedQuery);
    const [ rows ] = await global.db.execute(query);
    const list = rows;

    res.status(200).send({ list });
});

router.get('/user/:UID', async (req, res) => {
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
});

module.exports = router;
