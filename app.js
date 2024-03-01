global.APP_ENVIRONMENT = process.env.APP_ENVIRONMENT ?? 'dev';

const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:8000',
    credentials: true
}));
app.use(express.json());

/* One to rule them all */
require('./questfinder/app')(app, server);

const port = global.APP_ENVIRONMENT == 'production' ? (process.env.PORT ?? null) : 8080;

server.listen(port, () => {
    console.log(`MultiApp listening on port ${server.address().port}, time: ${new Date()}`);
});