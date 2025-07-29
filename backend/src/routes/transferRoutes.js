const express = require('express');

const router = express.Router();

router.get('/status/:transferId', (req, res) => {
    res.json({ success: true, message: 'Transfer status endpoint (disabled for testing)' });
});

module.exports = router;