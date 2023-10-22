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

const port = 8080;
app.use(cors());
app.use(express.json());

// handle websockets
require('./server_utils/webSockets')(socketIo);

// firebase
global.firebase = require('firebase-admin');
const serviceAccountPath = process.env.QUESTFINDER_SERVICE_ACCOUNT;
global.firebase.initializeApp({
    credential: global.firebase.credential.cert(serviceAccountPath),
});

// google services
require('./server_utils/googleServices');

// database
require('./server_utils/database')(app);

app.get('/', (req, res) => {
    // test.html
    res.sendFile(__dirname + '/test.html');
});

// handle routes
require('./routers/routers')(app);

server.listen(port, () => {
    console.log(`App listening on port ${port}`);
});