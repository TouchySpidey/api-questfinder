const express = require('express')
const cors = require('cors')

const app = express()
const port = 8080
app.use(cors());
app.use(express.json());

// handle routes
require('./routes')(app);

// firebase
global.firebase = require('firebase-admin');
global.firebase.initializeApp({
    databaseURL: 'https://oneshot-79f76-default-rtdb.europe-west1.firebasedatabase.app/'
});
global.db = global.firebase.database();
const fcm = require('./fcm/manager');

app.get('/version', (req, res) => {
    // get app version from package.json
    const appVersion = require('./package.json').version
    const appStuff = global.firebase.app()
    // out app name and version
    res.send(`Running ${appStuff.name} on v${appVersion} 😍`)
})

// this is for debugging purposes only
app.get('/test.html', (req, res) => {
    res.sendFile(__dirname + '/test.html');
})

// custom docs on /api-docs
require('./api-docs')(app);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})