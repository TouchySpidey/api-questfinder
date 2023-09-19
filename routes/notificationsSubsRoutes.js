const express = require('express');
const {
    subscribe,
    unsubscribe,
} = require.main.require('./controllers/notificationSubsController');
const authenticate = require('../authMiddleware');

const router = express.Router();

router.post('/subscribe', authenticate, subscribe);
router.delete('/unsubscribe/:subUID', authenticate, unsubscribe);

module.exports = router;
