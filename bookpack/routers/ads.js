const express = require('express');
const router = express.Router();
const { authenticate } = global.authenticators;
const fs = require('fs');

router.get('/list', async (req, res) => {
    try {
        const { distance, distanceFromLat, distanceFromLon } = req.query;
        const { searchString, conditions, sortBy, sortDir } = req.query;
        let orderBy = {};
        switch (sortDir?.toLowerCase()) {
            case 'asc':
                orderBy.dir = 'ASC';
                break;
            case 'desc':
                orderBy.dir = 'DESC';
                break;
            default:
                orderBy = null;
                break;
        }
        switch (sortBy?.toLowerCase()) {
            case 'recent':
                orderBy.by = 'postedOn';
                break;

            case 'price': case 'distance': case 'rating':
                orderBy.by = sortBy.toLowerCase();
                break;

            default:
                orderBy = null;
                break;
        }
        const pars = [], wheres = [];
        if (searchString) {
            wheres.push(`(title LIKE ? OR isbn LIKE ?)`);
            pars.push(`%${searchString}%`, `%${searchString}%`);
        }
        if (conditions && conditions.length) {
            wheres.push(`conditions IN (?)`);
            pars.push(conditions);
        }
        if (distance && distanceFromLat && distanceFromLon) {
            wheres.push(`ST_Distance_Sphere(POINT(latitude, longitude), POINT(?, ?)) / 1000 <= ?`);
            pars.push(distanceFromLat, distanceFromLon, distance);
        } else if (orderBy?.by === 'distance') {
            orderBy = null;
        }
        const queryBuilding = `SELECT
          bp_ads.UID as adUID
        , conditions
        , price
        , isbn
        , title
        , postedOn
        , rating
        ${distance && distanceFromLat && distanceFromLon ? `, ROUND(ST_Distance_Sphere(POINT(latitude, longitude), POINT(?, ?)) / 1000) AS distance` : ''}
        FROM bp_ads
        JOIN bp_books ON bp_ads.bookCode = bp_books.isbn
        LEFT JOIN (
            SELECT userUID, AVG(rating) as rating
            FROM bp_reviews
            GROUP BY userUID
        ) ratings ON bp_ads.userUID = ratings.userUID
        WHERE ${wheres.length ? wheres.join(' AND ') : '1'}
        ${orderBy ? `ORDER BY ${orderBy.by} ${orderBy.dir}` : ''}`;
        const query = global.mysql.format(queryBuilding, pars);
        const [adsRows] = await global.db.query(query);
        return res.json(adsRows);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

router.get('/thumbnails/:adUID', async (req, res) => {
    try {
        const { adUID } = req.params;
        if (!adUID) return res.status(400).send("Bad Request");

        return res.json(getPics(adUID, 'thumbnails'));
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

router.get('/pics/:adUID', async (req, res) => {
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

module.exports = router;
