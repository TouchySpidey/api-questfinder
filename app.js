const express = require('express')
const authenticate = require('./authMiddleware');
const app = express()
const port = 8080

// firebase
const firebaseAdmin = require('firebase-admin');
firebaseAdmin.initializeApp();

app.get('/version', (req, res) => {
    // get app version from package.json
    const appVersion = require('./package.json').version
    const appStuff = firebaseAdmin.app()
    // out app name and version
    res.send(`Running ${appStuff.name} on v${appVersion} 😍`)
})

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