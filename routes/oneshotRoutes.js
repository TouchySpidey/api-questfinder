const express = require('express');
const {
    postOneshot,
    viewOneshot,
    editOneshot,
    deleteOneshot,
    joinOneshot,
    setTentative,
    leaveOneshot
} = require('../controllers/oneshotController');
const authenticate = require('../authMiddleware');

const router = express.Router();

router.post('/post', authenticate, postOneshot);
router.get('/view/:oneshotUID', authenticate, viewOneshot);
router.put('/edit/:oneshotUID', authenticate, editOneshot);
router.delete('/delete/:oneshotUID', authenticate, deleteOneshot);
router.post('/join/:oneshotUID', authenticate, joinOneshot);
router.post('/tentative/:oneshotUID', authenticate, setTentative);
router.post('/leave/:oneshotUID', authenticate, leaveOneshot);

module.exports = router;
