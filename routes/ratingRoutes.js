const express = require('express');
const {
    rateUser,
    unrateUser
} = require.main.require('./controllers/ratingController');
const authenticate = require('../authMiddleware');

const router = express.Router();

router.post('/rate', authenticate, rateUser);
router.delete('/unrate/:ratingId', authenticate, unrateUser);

module.exports = router;
