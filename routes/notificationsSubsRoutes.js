const express = require('express');
const controller = require.main.require('./controllers/notificationSubsController');
const authenticate = require('../authMiddleware');

const router = express.Router();

router.post('/subscribe', authenticate, controller.subscribe);
router.delete('/unsubscribe/:subUID', authenticate, controller.unsubscribe);

module.exports = router;
