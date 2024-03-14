
module.exports = (app) => {
    // handle routes
    app.use('/monster-quiz', require('./router'));
}
