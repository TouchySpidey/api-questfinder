global.APP_ENVIRONMENT = process.env.APP_ENVIRONMENT ?? 'dev';
global.projectUtils = require('./server_utils/projectUtils');

const initSocketIo = require('socket.io');

module.exports = (app, server) => {
    app.use('/questfinder', async (req, res, next) => {
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

        // handle routes
        require('./routers/routers')(app);
    });
}
