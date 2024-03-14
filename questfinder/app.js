global.projectUtils.questfinder = require('./projectUtils/_projectUtils');

module.exports = (app) => {
    // handle routes
    app.use('/questfinder', require('./routers/routers'));
}
