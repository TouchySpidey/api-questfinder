const express = require('express');
const router = express.Router();
const { authenticate } = global.authenticators;
const { adIO } = require('../projectUtils/_projectUtils');
const fs = require('fs');

router.post('/save', authenticate, async (req, res) => {
    try {
        const userUID = req.user.UID;
        const adData = await adIO.buildAdObject(req.body);
        if (adData?.error) return res.status(400).send(adData.error);

        global.db.execute(`INSERT INTO bp_ads
        (UID, userUID, bookCode, info, qualityCondition, price, availableForShipping, latitude, longitude, postedOn)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
            [adData.adUID, userUID, adData.isbn, adData.info, adData.qualityCondition, adData.price, adData.availableForShipping, adData.latitude, adData.longitude]);
        return res.status(200).send(adData.adUID);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

router.get('/:adUID', authenticate, async (req, res) => {
    try {
        const { adUID } = req.params;
        if (!adUID) return res.status(400).send("Bad Request");

        const adResponse = {};
        const [adRows] = await global.db.execute(`SELECT * FROM bp_ads WHERE UID = ?`, [adUID]);
        if (!adRows.length) return res.status(404).send("Ad not found");

        adResponse.ad = adRows[0];
        const [userRows] = await global.db.execute(`SELECT * FROM users WHERE UID = ?`, [adResponse.ad.userUID]);

        if (!userRows.length) return res.status(500).send("Internal Server Error");

        const [reviewRows] = await global.db.execute(`SELECT bp_reviews.*, reviewers.nickname
        FROM bp_reviews
        LEFT JOIN users reviewers
        ON reviewers.UID = bp_reviews.byUID
        WHERE userUID = ?`, [adResponse.ad.userUID]);
        adResponse.op = {
            user: userRows[0],
            reviews: reviewRows
        };
        return res.json(adResponse);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

router.get('/:adUID/thumbnails', async (req, res) => {
    try {
        const { adUID } = req.params;
        if (!adUID) return res.status(400).send("Bad Request");

        return res.json(getPics(adUID, 'thumbnails'));
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

router.get('/:adUID/pics', async (req, res) => {
    try {
        const { adUID } = req.params;
        if (!adUID) return res.status(400).send("Bad Request");

        return res.json(getPics(adUID));
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

const getPics = (adUID, type = 'originals') => {
    const directory = `uploads/ads/${type}/${adUID}`;
    return fs.readdirSync(directory);
};

module.exports = router;
