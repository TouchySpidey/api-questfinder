const express = require('express');
const router = express.Router();

const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

router.post('/new', async (req, res) => {
    try {
        const validatedInput = validateInput(res, req.body);
        if (!validatedInput) return;
        const { label, center, radius, days, time, viaPush, viaEmail } = validatedInput;

        const { user } = req;

        const _days = '#' + days.join('#') + '#';

        const UID = uuidv4();

        const newAlert = {
            uid: UID,
            userUID: user.UID,
            label,
            centerLat: center.lat,
            centerLng: center.lng,
            radius,
            days: _days,
            timeFrom: time.from,
            timeTo: time.to,
            viaPush,
            viaEmail,
            userUID: user.uid,
        };

        const [rows] = await global.db.execute(`INSERT INTO alerts
            (UID, userUID, label, centerLat, centerLng, radius, days, timeFrom, timeTo, viaPush, viaEmail, createdOn)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
            [UID, user.UID, label, center.lat, center.lng, radius, _days, time.from, time.to, viaPush, viaEmail]
        );
        res.status(201).json({ UID });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

router.get('/list', async (req, res) => {
    try {
        const { user } = req;
    
        const [alertsRow] = await global.db.execute('SELECT * FROM alerts WHERE userUID = ?', [user.UID]);
        const alerts = alertsRow.map(alert => {
            return {
                UID: alert.UID,
                label: alert.label,
                center: {
                    lat: alert.centerLat,
                    lng: alert.centerLng,
                },
                radius: alert.radius,
                days: alert.days.substring(1, alert.days.length - 1).split('#'),
                time: {
                    from: alert.timeFrom,
                    to: alert.timeTo,
                },
                viaPush: alert.viaPush,
                viaEmail: alert.viaEmail,
            };
        });
    
        return res.status(200).json({ alerts });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
});

function validateInput(res, inputToValidate) {
    const { label, center, radius, days, time } = inputToValidate;
    if (!label || !center || !radius || !days || !time) {
        res.status(400).send('Missing required fields');
        return;
    }

    if (!moment(time.from, 'HH:mm', true).isValid() || !moment(time.to, 'HH:mm', true).isValid()) {
        res.status(400).send('Invalid time format');
        return;
    }

    if (moment(time.from, 'HH:mm').isAfter(moment(time.to, 'HH:mm'))) {
        res.status(400).send('Invalid time range');
        return;
    }

    if (!Array.isArray(days) || days.length === 0) {
        res.status(400).send('Invalid days');
        return;
    }

    if (!time.from || !time.to || time.from.length === 0 || time.to.length === 0) {
        res.status(400).send('Invalid time');
        return;
    }

    return inputToValidate;
}

module.exports = router;
