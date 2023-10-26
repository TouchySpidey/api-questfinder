global.APP_ENVIRONMENT = process.env.APP_ENVIRONMENT ?? 'dev';

const express = require('express');
const cors = require('cors');
const http = require('http');
const initSocketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const socketIo = initSocketIo(server, {
    cors: {
        origin: "*", // Replace with your frontend URL
        methods: ["GET", "POST"]
    }
});

const port = global.APP_ENVIRONMENT == 'production' ? null : 8080;
app.use(cors());
app.use(express.json());

// handle websockets
require('./server_utils/webSockets')(socketIo);

// firebase
global.firebase = require('firebase-admin');
const serviceAccount = require(process.env.QUESTFINDER_SERVICE_ACCOUNT);
global.firebase.initializeApp({
    credential: global.firebase.credential.cert(serviceAccount),
});

// google services
require('./server_utils/googleServices');

// database
require('./server_utils/database')(app);

app.get('/', (req, res) => {
    // test.html
    res.sendFile(__dirname + '/test.html');
});

app.get('/firebase-messaging-sw.js', (req, res) => {
    // firebase-messaging-sw.js
    res.sendFile(__dirname + '/firebase-messaging-sw.js');
});

// handle routes
require('./routers/routers')(app);

server.listen(port, () => {
    console.log(`App listening on port ${server.address().port}`);
});
