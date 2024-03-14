global.projectUtils = {}; // init for apps to use

// token verifier
require('./tokenVerifier');

// firebase
require('./initFirebase')();

// google services
require('./googleServices');

module.exports = (app, server) => {
    // MySQL database
    require('./database')(app);

    // web sockets
    require('./webSockets')(server);
}
