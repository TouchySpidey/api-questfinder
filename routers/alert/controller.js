const express = require('express');
const router = express.Router();

const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

router.post('/new', async (req, res) => {
    try {
        const validatedInput = validateInput(res, req.body);
        if (!validatedInput) return;
        const { label, placeLat, placeLng, radius, days, timeFrom, timeTo, viaPush, viaEmail } = validatedInput;

        const { user } = req;

        const _days = '#' + days.join('#') + '#';

        const UID = uuidv4();

        const newAlert = {
            uid: UID,
            userUID: user.UID,
            label,
            placeLat,
            placeLng,
            radius,
            days: _days,
            timeFrom,
            timeTo,
            viaPush,
            viaEmail,
            userUID: user.uid,
        };
        console.log([UID, user.UID, label, placeLat, placeLng, radius, _days, timeFrom, timeTo, viaPush, viaEmail]);

        const [rows] = await global.db.execute(`INSERT INTO alerts
            (UID, userUID, label, centerLat, centerLng, radius, days, timeFrom, timeTo, viaPush, viaEmail, createdOn)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
            [UID, user.UID, label, placeLat, placeLng, radius, _days, timeFrom, timeTo, viaPush, viaEmail]
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
    const { label, placeLat, placeLng, radius, days, timeFrom, timeTo } = inputToValidate;
    // if (!label || !placeLat || !placeLng || !radius || !days || !time) {
    //     res.status(400).send('Missing required fields');
    //     return;
    // }

    if (!placeLat) {
        inputToValidate.placeLat = null;
    }
    if (!placeLng) {
        inputToValidate.placeLng = null;
    }
    if (!radius) {
        inputToValidate.radius = null;
    }
    if (!days) {
        inputToValidate.days = null;
    }
    if (!timeFrom) {
        inputToValidate.timeFrom = null;
    }
    if (!timeTo) {
        inputToValidate.timeTo = null;
    }

    if (!moment(timeFrom, 'HH:mm', true).isValid() || !moment(timeTo, 'HH:mm', true).isValid()) {
        res.status(400).send('Invalid time format');
        return;
    }

    if (moment(timeFrom, 'HH:mm').isAfter(moment(timeTo, 'HH:mm'))) {
        res.status(400).send('Invalid time range');
        return;
    }

    if (!Array.isArray(days) || days.length === 0) {
        res.status(400).send('Invalid days');
        return;
    }

    if (!timeFrom || !timeTo || timeFrom.length === 0 || timeTo.length === 0) {
        res.status(400).send('Invalid time');
        return;
    }

    return inputToValidate;
}

module.exports = router;
