const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

function getAccessToken(req) {
    const accessToken = req.headers.authorization;
    const authGet = req.query.auth;

    if ((!accessToken || !accessToken.startsWith('Bearer ')) && !authGet) {
        return null;
    }
    return accessToken ? accessToken.split('Bearer ')[1] : authGet;
}

async function decodeTokenFirebase(token) {
    try {
        const decodedToken = await global.firebase.auth().verifyIdToken(token);
        return {
            firebaseUID: decodedToken.uid,
            email: decodedToken.email
        };
    } catch (error) {
        return null;
    }
}

function decodeTokenVanilla(token) {
    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
        return decodedToken;
    } catch (error) {
        return null;
    }
}

const refreshAndValidateToken = async (accessToken, refreshToken, res) => {
    if (!accessToken || !refreshToken) return false;
    try {
        const decodedAccessToken = jwt.verify(accessToken, process.env.JWT_SECRET, { ignoreExpiration: true });

        // jwt.verify will throw an error if the refresh token is expired because we're not using option "ignoreExpiration" as we did with the access token
        const decodedRefreshToken = jwt.verify(refreshToken, process.env.JWT_SECRET);
        if (decodedRefreshToken.userUID != decodedAccessToken.UID) return false; // userUID mismatch

        // check in db if it's still there because user might have wanted to revoke it or it could have expired
        const [refreshTokenRows] = await global.db.execute('SELECT * FROM refresh_tokens WHERE tokenUID = ? AND userUID = ? AND expiresOn > UTC_TIMESTAMP()', [decodedRefreshToken.tokenUID, decodedRefreshToken.userUID]);
        if (!refreshTokenRows.length) return false;

        if (decodedAccessToken.exp * 1000 > Date.now()) return true;

        // refresh token ok, create new access token
        accessToken = jwt.sign({
            UID: decodedAccessToken.UID,
            email: decodedAccessToken.email,
            nickname: decodedAccessToken.nickname
        }, process.env.JWT_SECRET, { expiresIn: '15m' });
        global.db.execute('UPDATE refresh_tokens SET refreshCounter = refreshCounter + 1 WHERE tokenUID = ?', [decodedRefreshToken.tokenUID]);
        res.header('Authorization', `Bearer ${accessToken}`);

        return true;
    } catch (error) {
        return false;
    }
}

const decodeToken = async (token) => {
    let decodedToken = null;
    let tokenType = false;
    if (!token) return { decodedToken, tokenType };

    if (decodedToken = await decodeTokenFirebase(token)) {
        tokenType = 'firebase';
        return { decodedToken, tokenType };
    }

    if (decodedToken = decodeTokenVanilla(token)) {
        tokenType = 'jwt';
        return { decodedToken, tokenType };
    }

    return { decodedToken, tokenType };
}

const getAuthenticatedUser = async (req, res) => {
    try {
        const accessToken = getAccessToken(req);
        const { decodedToken, tokenType } = await decodeToken(accessToken);
        if (tokenType == 'jwt') {
            const { refreshToken } = req.cookies;
            if (! await refreshAndValidateToken(accessToken, refreshToken, res)) return null;
        }
        if (tokenType == 'firebase') {
            const [existingUserRows] = await global.db.execute('SELECT UID, firebaseUID, email, signedUpOn, updatedOn FROM users WHERE firebaseUid = ?', [firebaseToken.firebaseUID]);
            if (existingUserRows.length) {
                return existingUserRows[0];
            } else {
                const UID = uuidv4();
                await global.db.execute('INSERT INTO users (UID, firebaseUID, email, signedUpOn, updatedOn) VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())', [UID, firebaseUID, email]);
                const [newUserRows] = await global.db.execute('SELECT * FROM users WHERE firebaseUid = ?', [firebaseToken.firebaseUID]);
                return newUserRows[0];
            }
        }
        if (tokenType == 'jwt') {
            const [existingUserRows] = await global.db.execute('SELECT UID, firebaseUID, email, signedUpOn, updatedOn FROM users WHERE UID = ?', [decodedToken.UID]);
            if (existingUserRows.length) {
                return existingUserRows[0];
            }
        }
    } catch (error) {
        console.error(error);
    }
    return null;
}

global.authenticators = {
    decodeToken,
    authenticate: async (req, res, next) => {
        try {
            if (user = await getAuthenticatedUser(req, res)) {
                req.user = user;
                return next();
            }
        } catch (error) {
            console.error(error);
        }
        return res.status(401).send('Not Authenticated');
    },
    tryAuthenticate: async (req, res, next) => {
        try {
            if (user = await getAuthenticatedUser(req, res)) req.user = user;
        } catch (error) {
            console.error(error);
        }
        next();
    }
}
