const authenticate = require('./authMiddleware');

module.exports = app => {
    app.use('/api/oneshot', authenticate, require('./routes/oneshotRoutes'));
    app.use('/api/user', authenticate, require('./routes/userRoutes'));
    app.use('/api/rating', authenticate, require('./routes/ratingRoutes'));
    app.use('/api/notifications', authenticate, require('./routes/notificationsSubsRoutes'));
}