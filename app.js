global.APP_ENVIRONMENT = process.env.APP_ENVIRONMENT ?? 'dev';
global.tokenVerifier = require('./tokenVerifier');

const express = require('express');
const cors = require('cors');
const http = require('http');
const initSocketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use((req, res, next) => {
    // Disable caching for all routes
    res.header('Cache-Control', 'no-store');
    next();
});
const _CORS_OPTIONS = {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:8000',
    credentials: true
};
app.use(cors(_CORS_OPTIONS));
console.log(`App cors options: ${JSON.stringify(_CORS_OPTIONS, null, 4)}`);
app.use(express.json());

// database
require('./database')(app);

/* One to rule them all */
require('./questfinder/app')(app, server);

// handle websockets
const socketIo = initSocketIo(server, {
    cors: {
        origin: "*", // Replace with your frontend URL
        methods: ["GET", "POST", "DELETE"],
    }
});
require('./webSockets')(socketIo);

const port = global.APP_ENVIRONMENT == 'production' ? (process.env.PORT ?? null) : 8080;

server.listen(port, () => {
    console.log(`MultiApp listening on port ${server.address().port}, time: ${new Date()}`);
});