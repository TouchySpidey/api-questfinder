exports.getUser = async (req, res) => {
    const userFID = req.params.userFID;
    try {
        const userRef = global.db.ref(`users/${userFID}`);
        userRef.once("value", snapshot => {
            const userData = snapshot.val();
            if (userData && userData.nickname) {
                res.status(200).json({
                    nickname: userData.nickname,
                    hashnum: userData.hashnum,
                });
            } else {
                res.status(200).json(null);
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

exports.updateUser = async (req, res) => {
    const uid = req.uid;
    const nickname = req.body.nickname;
    const email = req.body.email;

    // only allow alphanumeric characters, dashes and underscores
    if (!nickname.match(/^[a-zA-Z0-9-_]+$/)) {
        return res.status(400).send("Invalid nickname");
    }

    if (!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
        return res.status(400).send("Invalid email");
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
            const userRef = global.db.ref(`users/${uid}`);
            const snapshot = await userRef.once("value");
            const userData = snapshot.val();
            // get timestamp in format YYYY-MM-DD HH:MM:SS
            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            if (!userData.previous_versions) {
                userData.previous_versions = {};
            }
            userData.previous_versions[timestamp] = {
                nickname: userData.nickname,
                hashnum: userData.hashnum,
                email: userData.email,
            };
            const updatedUserData = {
                ... userData,
                ...timestamp,
                ...nickname,
                ...hashnum,
                ...email,
            };
            await userRef.update(updatedUserData);
            res.status(200).json({
                nickname: nickname,
                hashnum: hashnum,
                email: email,
            });
        } else {
            res.status(409).send("All hashnums for this nickname are taken");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

