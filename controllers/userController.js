exports.getNickname = async (req, res) => {
    const uid = req.uid;
    try {
        const userRef = global.db.ref(`users/${uid}`);
        userRef.once("value", snapshot => {
            const userData = snapshot.val();
            if (userData && userData.nickname) {
                res.status(200).json({ nickname: userData.nickname });
            } else {
                res.status(200).json(null);
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

exports.setNickname = async (req, res) => {
    const uid = req.uid;
    const nickname = req.body.nickname;

    // only allow alphanumeric characters, dashes and underscores
    if (!nickname.match(/^[a-zA-Z0-9-_]+$/)) {
        return res.status(400).send("Invalid nickname");
    }

    try {
        const usersRef = global.db.ref('users');
        let unique = false;
        let hashnum = Math.floor(Math.random() * 9000) + 1000;
        const original_random = hashnum;
        let back_to_original = false;

        while (!unique && !back_to_original) {
            const snapshot = await usersRef.orderByChild("nicknameHash").equalTo(`${nickname}#${hashnum}`).once("value");
            unique = !snapshot.exists();

            if (!unique) {
                hashnum++;
                if (hashnum > 9999) hashnum = 1000;
                back_to_original = (hashnum === original_random);
            }
        }

        if (unique) {
            // Save the nickname and hashnum
            const userRef = db.ref(`users/${uid}`);
            // get timestamp in format YYYY-MM-DD HH:MM:SS
            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            userRef.update({ nickname: nickname, hashnum: hashnum, timestamp: timestamp }, error => {
                if (error) {
                    console.error(error);
                    res.status(500).send("Internal Server Error");
                } else {
                    res.status(200).json({ nickname: nickname, hashnum: hashnum });
                }
            });
        } else {
            res.status(409).send("All hashnums for this nickname are taken");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

