const express = require('express');
const controller = require.main.require('./controllers/ratingController');
const authenticate = require('../authMiddleware');

const router = express.Router();

router.post('/rate', authenticate, controller.rateUser);
router.delete('/unrate/:ratingId', authenticate, controller.unrateUser);

module.exports = router;
