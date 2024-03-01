global.APP_ENVIRONMENT = process.env.APP_ENVIRONMENT ?? 'dev';
global.projectUtils = require('./server_utils/projectUtils');
const initSocketIo = require('socket.io');

// handle websockets
const socketIo = initSocketIo(server, {
    cors: {
        origin: "*", // Replace with your frontend URL
        methods: ["GET", "POST", "DELETE"],
    }
});
require('./server_utils/webSockets')(socketIo);

// firebase
require('./server_utils/initFirebase')();

// google services
require('./server_utils/googleServices');

// database
require('./server_utils/database')(app);


module.exports = (app, server) => {
    // handle routes
    app.use('/questfinder', require('./routers/routers'));
}
