const express = require('express');
const controller = require.main.require('./controllers/userController');
const authenticate = require('../authMiddleware');

const router = express.Router();

router.get('/get/:userFID', controller.getUser);
router.post('/update', authenticate, controller.updateUser);

module.exports = router;
