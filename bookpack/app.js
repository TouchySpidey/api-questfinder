
module.exports = (app, server) => {
    // handle routes
    app.use('/bookpack', require('./routers/routers'));
}
