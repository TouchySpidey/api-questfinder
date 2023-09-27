const express = require('express');
const controller = require.main.require('./controllers/oneshotController');
const authenticate = require('../authMiddleware');

const router = express.Router();

router.post('/post', authenticate, controller.postOneshot);
router.get('/view/:oneshotUID', authenticate, controller.viewOneshot);
router.put('/edit/:oneshotUID', authenticate, controller.editOneshot);
router.delete('/delete/:oneshotUID', authenticate, controller.deleteOneshot);
router.post('/join/:oneshotUID', authenticate, controller.joinOneshot);
router.post('/tentative/:oneshotUID', authenticate, controller.setTentative);
router.post('/leave/:oneshotUID', authenticate, controller.leaveOneshot);

module.exports = router;
