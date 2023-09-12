const express = require('express');
const { getNickname, setNickname } = require('../controllers/userController');
const authenticate = require('../authMiddleware');

const router = express.Router();

router.get('/get-nickname', authenticate, getNickname);
router.post('/set-nickname', authenticate, setNickname);

module.exports = router;
