const express = require('express');
const router = express.Router();
const { authenticate } = global.authenticators;
const { adIO } = require('../projectUtils/_projectUtils');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

router.post('/save', authenticate, global.multerUpload.array('pics'), async (req, res) => {
    try {
        const userUID = req.user.UID;
        const adData = await adIO.buildAdObject(req.body);
        if (adData?.error) return res.status(400).send(adData.error);

        const adOriginalFolder = path.join('uploads', 'ads', 'originals', adData.adUID);
        if (!fs.existsSync(adOriginalFolder)) {
            fs.mkdirSync(adOriginalFolder);
        }
        const adThumbnailFolder = path.join('uploads', 'ads', 'thumbnails', adData.adUID);
        if (!fs.existsSync(adThumbnailFolder)) {
            fs.mkdirSync(adThumbnailFolder);
        }

        req.files.forEach((file, index) => {
            const extension = path.extname(file.originalname);
            const newFileName = `${(index + 1).toString().padStart(2, '0')}${extension}`;
            const oldPath = path.join(file.path);
            const newPath = path.join(adOriginalFolder, newFileName);
            fs.renameSync(oldPath, newPath);
            sharp(newPath).resize(200, 200).toFile(path.join(adThumbnailFolder, newFileName));
        });

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

        const picsDir = path.join('uploads', 'ads', 'originals', adUID);
        if (fs.existsSync(picsDir)) adResponse.pics = fs.readdirSync(picsDir);
        else adResponse.pics = [];

        const thumbDir = path.join('uploads', 'ads', 'originals', adUID);
        if (fs.existsSync(thumbDir)) adResponse.thumbnails = fs.readdirSync(thumbDir);
        else adResponse.thumbnails = [];

        return res.status(200).json(adResponse);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

router.get('/:adUID/thumbnail/:picName', async (req, res) => {
    return getPic(req, res, 'thumbnails');
});

router.get('/:adUID/pic/:picName', async (req, res) => {
    return getPic(req, res, 'originals');
});

const getPic = (req, res, type) => {
    try {
        const { adUID, picName } = req.params;
        if (!adUID) return res.status(400).send("Bad Request");

        const thumbDir = path.join('uploads', 'ads', type, adUID);
        if (!fs.existsSync(thumbDir)) return res.status(404).send("Ad not found");
        const thumbPath = path.join(thumbDir, picName);
        if (!fs.existsSync(thumbPath)) return res.status(404).send("Pic not found");
        return res.status(200).sendFile(path.resolve(thumbPath));
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
}

router.get('/:adUID/pics', async (req, res) => {
    try {
        const { adUID } = req.params;
        if (!adUID) return res.status(400).send("Bad Request");

        const pics = getPics(adUID);
        if (!pics.length) return res.status(404).send("Ad not found");
        // serve the first pic
        return res.sendFile(path.join('uploads', 'ads', 'originals', adUID, pics[0]));
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
