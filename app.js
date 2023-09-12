const express = require('express')
const cors = require('cors')
const authenticate = require('./authMiddleware');
const oneshotRoutes = require('./routes/oneshotRoutes');
const userRoutes = require('./routes/userRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const app = express()
const port = 8080

// firebase
global.firebase = require('firebase-admin');
global.firebase.initializeApp({
    databaseURL: 'https://oneshot-79f76-default-rtdb.europe-west1.firebasedatabase.app/'
});
global.db = global.firebase.database();

app.use(cors());
app.use(express.json());

// Use Route Files
app.use('/api/oneshot', authenticate, oneshotRoutes);
app.use('/api/user', authenticate, userRoutes);
app.use('/api/rating', authenticate, ratingRoutes);

app.get('/version', (req, res) => {
    // get app version from package.json
    const appVersion = require('./package.json').version
    const appStuff = firebaseAdmin.app()
    // out app name and version
    res.send(`Running ${appStuff.name} on v${appVersion} 😍`)
})

// this is for debugging purposes only
app.get('/test.html', (req, res) => {
    res.sendFile(__dirname + '/test.html');
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})