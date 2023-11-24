const authenticate = require('../server_utils/apiAuthenticator');

module.exports = app => {
    app.get('/api/keys', (req, res) => {
        res.send({
            'firebase': global.firebaseServiceAccount,
            'google': process.env.GOOGLE_API_KEY_FRONTEND,
        });
    });

    app.use('/api/public', require('./_public/controller'));
    
    app.use('/api/alert', authenticate, require('./alert/controller'));
    app.use('/api/user', authenticate, require('./user/controller'));
    app.use('/api/oneshot', authenticate, require('./oneshot/routing'));
    app.use('/api/device', authenticate, require('./device/controller'));
    app.use('/api/notificationPreferences', authenticate, require('./notificationPreferences/controller'));

    // 404
    app.use((req, res) => {
        res.status(404).send({ error: '404: Not Found' });
    });
}
