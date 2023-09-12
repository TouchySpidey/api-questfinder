const express = require('express');
const {
    postOneshot,
    viewOneshot,
    editOneshot,
    deleteOneshot,
    joinOneshot,
    markTentative,
    leaveOneshot
} = require('../controllers/oneshotController');
const authenticate = require('../authMiddleware');

const router = express.Router();

router.post('/post', authenticate, postOneshot);
router.get('/view/:oneshotId', authenticate, viewOneshot);
router.put('/edit/:oneshotId', authenticate, editOneshot);
router.delete('/delete/:oneshotId', authenticate, deleteOneshot);
router.post('/join/:oneshotId', authenticate, joinOneshot);
router.post('/tentative/:oneshotId', authenticate, markTentative);
router.post('/leave/:oneshotId', authenticate, leaveOneshot);

module.exports = router;
