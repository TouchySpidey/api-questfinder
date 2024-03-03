global.projectUtils = require('./server_utils/projectUtils');

// firebase
require('./server_utils/initFirebase')();

// google services
require('./server_utils/googleServices');


module.exports = (app, server) => {
    // handle routes
    app.use('/questfinder', require('./routers/routers'));
}
