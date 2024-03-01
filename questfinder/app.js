global.APP_ENVIRONMENT = process.env.APP_ENVIRONMENT ?? 'dev';
global.projectUtils = require('./server_utils/projectUtils');

const initSocketIo = require('socket.io');

module.exports = (app, server) => {
    const socketIo = initSocketIo(server, {
        cors: {
            origin: "*", // Replace with your frontend URL
            methods: ["GET", "POST", "DELETE"],
        }
    });
    // handle websockets
    require('./server_utils/webSockets')(socketIo);

    // firebase
    require('./server_utils/initFirebase')();

    // google services
    require('./server_utils/googleServices');

    // database
    require('./server_utils/database')(app);

    // handle routes
    require('./routers/routers')(app);
}