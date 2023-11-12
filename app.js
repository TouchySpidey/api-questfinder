global.APP_ENVIRONMENT = process.env.APP_ENVIRONMENT ?? 'dev';

global.projectUtils = require('./server_utils/projectUtils');
const express = require('express');
const cors = require('cors');
const http = require('http');
const initSocketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const socketIo = initSocketIo(server, {
    cors: {
        origin: "*", // Replace with your frontend URL
        methods: ["GET", "POST", "DELETE"],
    }
});

const port = global.APP_ENVIRONMENT == 'production' ? (process.env.PORT ?? null) : 8080;
app.use(cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:8000',
    credentials: true
}));
app.use(express.json());

// handle websockets
require('./server_utils/webSockets')(socketIo);

// firebase
require('./server_utils/initFirebase')();

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
    console.log(`App listening on port ${server.address().port}, time: ${new Date()}`);
});
