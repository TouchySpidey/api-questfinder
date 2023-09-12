const express = require('express')
const cors = require('cors')
const authenticate = require('./authMiddleware');
const oneshotRoutes = require('./routes/oneshotRoutes');
const userRoutes = require('./routes/userRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const app = express()
const port = 8080

// firebase
const firebaseAdmin = require('firebase-admin');
firebaseAdmin.initializeApp();

app.use(cors());
app.use(express.json());

// Use Route Files
app.use('/api/oneshot', oneshotRoutes);
app.use('/api/user', userRoutes);
app.use('/api/rating', ratingRoutes);

app.get('/version', (req, res) => {
    // get app version from package.json
    const appVersion = require('./package.json').version
    const appStuff = firebaseAdmin.app()
    // out app name and version
    res.send(`Running ${appStuff.name} on v${appVersion} 😍`)
})

app.get('/user/get-nickname', authenticate, (req, res) => {
    // authenticated users can get their nickname, which is stored in firebase's realtime database
    // if they don't have one, return null.  some actions are unavailable if they don't have a nickname
    // nicknames are stored as attributes of the user's in the db
    // return either {nickname, hashnum} or null
})

app.get('/user/set-nickname', authenticate, (req, res) => {
    // authenticated users can set their nickname, which is stored in firebase's realtime database
    // nicknames can be not unique as we'll do like discord and add a #nnnn to the end of the nickname, that will render the nickname unique
    const nickname = req.query.nickname;
    const uid = req.uid;
    const nicknameRegex = /^[a-zA-Z0-9_-éèêëàâäôöùûüçì]+$/i;
    if (!nicknameRegex.test(nickname)) {
        res.status(400).send("Nickname is invalid. Only alphanumeric characters, letters, underscore and dash are allowed.");
        return;
    }

    // 2) generate a random number between 1000 and 9999 that must not be in use associated with the nickname
    const hashnum = Math.floor(Math.random() * 9000) + 1000;
    // make it a string
    const hashnumString = hashnum.toString();
    // check if it's in use in the database

    // 3) set the nickname in the database


    // 4) return the nickname to the user in a format {nickname: "nickname", hashnum: "xxxx"}

})

app.get('/oneshot/post', authenticate, (req, res) => {}) // create a new oneshot, return shareable link that of course contains /oneshot/view

app.get('/oneshot/view', authenticate, (req, res) => {}) // return oneshot data, including the list of players who already joined

app.get('/oneshot/edit', authenticate, (req, res) => {}) // edit an existing oneshot

app.get('/oneshot/delete', authenticate, (req, res) => {}) // if authenticated user is the master of the oneshot, change the oneshot's is_deleted attribute to true

app.get('/oneshot/join', authenticate, (req, res) => {}) // join an existing oneshot (master shouldn't be able to join their own oneshot, also prevent idempotent requests)

app.get('/oneshot/leave', authenticate, (req, res) => {}) // leave an existing oneshot (also prevent idempotent requests)

app.get('/user/rate', authenticate, (req, res) => {}) // allow authenticated user to rate another user, if they hasn't yet, not themself, and if they're in the same oneshot, after the oneshot date

app.get('/user/unrate', authenticate, (req, res) => {}) // allow authenticated user to unrate another user, if they has rated them, not themself, and if they're in the same oneshot, after the oneshot date

app.get('/user/info', authenticate, (req, res) => {
    // At this point, the user is authenticated, and their UID is in req.uid
    res.send(`User logged in.  Here's their email as proof: ${req.email}`);
});

// this is for debugging purposes only
app.get('/test.html', (req, res) => {
    res.sendFile(__dirname + '/test.html');
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})