const token_verifier = require('./tokenVerifier');
const { v4: uuidv4 } = require('uuid');

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).send('Unauthorized');
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await token_verifier(idToken);
        
        if (!decodedToken) {
            return res.status(401).send('Unauthorized');
        }
        
        const { firebaseUID, email } = decodedToken;
    
        const [rows] = await global.db.execute('SELECT * FROM users WHERE firebaseUid = ?', [firebaseUID]);
        
        let user;
        if (rows.length > 0) {
            user = rows[0];
        } else {
            const UID = uuidv4();
            await global.db.execute( 'INSERT INTO users (UID, firebaseUID, email, signedUpOn, updatedOn) VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())', [UID, firebaseUID, email] );
            user.UID = UID;
            user.new = true;
        }
        
        req.user = user;
        next();
    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
}