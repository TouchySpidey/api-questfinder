const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { validateQuery, search } = require('./utils');
const { messageToDB: sendMessage, listMessages } = require.main.require('./routers/messages/utils');
const { statuses } = require.main.require('./constants');

module.exports.post = async (req, res) => {
    try {
        const validatedInput = validateInput(res, req.body);
        if (!validatedInput) {
            return res.status(400).send("Invalid input");
        }
        const { date, time, placeLat, placeLng, placeDescription, title, playersMax, playersOut, gameLevel, description } = validatedInput;
        
        const { user } = req;
        
        const UID = uuidv4();
        const appointmentOn = date + ' ' + time + ':00';

        // using google apis, get city name and province from lat and lng
        const reverseGeocodeResponse = await global.googleMapsClient.reverseGeocode({latlng: [placeLat, placeLng]}).asPromise();
        const addressComponents = reverseGeocodeResponse.json.results[0].address_components;
        const placeCity = addressComponents.find(component => component.types.includes('administrative_area_level_3')).long_name;
        const placeProvince = addressComponents.find(component => component.types.includes('administrative_area_level_2')).long_name;
    
        const [rows] = await global.db.execute(`INSERT INTO oneshots
            (UID, masterUID, appointmentOn, placeLat, placeLng, placeDescription, placeCity, placeProvince, title, playersMax, playersOut, gameLevel, description, createdOn)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
            [UID, user.UID, appointmentOn, placeLat, placeLng, placeDescription, placeCity, placeProvince, title, playersMax, playersOut, gameLevel, description]
        );
        res.status(201).json({ UID });
        sendMessage(null, 'ONESHOT', UID, 'Chat room aperta');
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
}

module.exports.view = async (req, res) => {
    try {
        const { user } = req;
        const oneshotUID = req.params.UID;
        const [ oneshotRow ] = await global.db.execute('SELECT * FROM oneshots WHERE UID = ?', [oneshotUID]);
        if (oneshotRow.length === 0) {
            return res.status(404).send("Oneshot not found");
        }
        const oneshot = oneshotRow[0];
        const [ masterRow ] = await global.db.execute('SELECT UID, nickname, bio, signedUpOn FROM users WHERE UID = ?', [oneshot.masterUID]);
        if (masterRow.length === 0) {
            return res.status(404).send("Master not found");
        }
        const master = masterRow[0];
        const isMaster = master.UID === user.UID;
        let output = {
            oneshot,
            master
        };
        if (isMaster) {
            output.status = statuses.MASTER;
        } else {
            const [ joinRequestRows ] = await global.db.execute(`SELECT * FROM join_requests WHERE oneshotUID = ? AND userUID = ?`, [ oneshotUID, user.UID ]);
            if (joinRequestRows.length === 0) {
                output.status = statuses.NOT_REQUESTED;
            } else {
                output.status = joinRequestRows[0].status;
            }
        }
        output.messages = await listMessages('ONESHOT', oneshotUID, user.UID);

        res.status(200).json( output );
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

module.exports.delete = async (req, res) => {
    try {
        const oneshotUID = req.params.UID;  // Assuming the UID is passed as a URL parameter
        const { user } = req;
        const [ oneshotRow ] = await global.db.execute('SELECT * FROM oneshots WHERE UID = ?', [oneshotUID]);
        if (oneshotRow.length === 0) {
            return res.status(404).send("Oneshot not found");
        }
        const oneshot = oneshotRow[0];
        if (oneshot.isDeleted) {
            return res.status(200).send("Oneshot already deleted");
        }
        if (oneshot.masterUID !== user.UID) {
            return res.status(403).send("Permission denied");
        }
        await global.db.execute('UPDATE oneshots SET isDeleted = 1 WHERE UID = ?', [oneshotUID]);
        res.status(200).send("Oneshot deleted successfully");
        sendMessage(null, 'ONESHOT', oneshotUID, 'Chat room chiusa');
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

module.exports.edit = async (req, res) => {
    try {
        const oneshotUID = req.params.UID;
        const [ oneshotRow ] = await global.db.execute('SELECT * FROM oneshots WHERE UID = ? AND isDeleted = 0', [oneshotUID]);
        if (oneshotRow.length === 0) {
            return res.status(404).send("Oneshot not found");
        }
        const oneshot = oneshotRow[0];
        const { user } = req;
        if (oneshot.masterUID !== user.UID) {
            return res.status(403).send("Permission denied");
        }
        const validatedInput = validateInput(res, req.body);
        if (!validatedInput) {
            return res.status(400).send("Invalid input");
        }
        const { date, time, placeLat, placeLng, placeDescription, title, playersMax, playersOut, gameLevel, description } = validatedInput;

        const appointmentOn = date + ' ' + time + ':00';

        // using google apis, get city name and province from lat and lng
        const reverseGeocodeResponse = await global.googleMapsClient.reverseGeocode({latlng: [placeLat, placeLng]}).asPromise();
        const addressComponents = reverseGeocodeResponse.json.results[0].address_components;
        const placeCity = addressComponents.find(component => component.types.includes('administrative_area_level_3')).long_name;
        const placeProvince = addressComponents.find(component => component.types.includes('administrative_area_level_2')).long_name;
    
        await global.db.execute(`UPDATE oneshots
            SET appointmentOn = ?, placeLat = ?, placeLng = ?, placeDescription = ?, placeCity = ?, placeProvince = ?, title = ?, playersMax = ?, playersOut = ?, gameLevel = ?, description = ?
            WHERE UID = ?`,
            [appointmentOn, placeLat, placeLng, placeDescription, placeCity, placeProvince, title, playersMax, playersOut, gameLevel, description, oneshotUID]
        );
        res.status(200).send("Oneshot edited successfully");
        sendMessage(null, 'ONESHOT', UID, 'I dettagli della oneshot sono stati modificati');
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal Server Error");
    }
}

module.exports.search = async (req, res) => {
    const { user } = req;
    const validatedQuery = validateQuery(req.query);
    if (!validatedQuery) {
        return res.status(400).send("Invalid query");
    }

    const list = await search(validatedQuery, user.UID);

    res.status(200).send({ list });
}

function validateInput(res, inputToValidate) {
    const { date, time, placeLat, placeLng, placeDescription, title, playersMax, playersOut, gameLevel, description } = inputToValidate;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).send("Invalid date format");
        return false;
    }
    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        res.status(400).send("Invalid time format");
        return false;
    }
    if (!placeLat || isNaN(placeLat) || placeLat < -90 || placeLat > 90) {
        res.status(400).send("Invalid place latitude");
        return false;
    }
    if (!placeLng || isNaN(placeLng) || placeLng < -180 || placeLng > 180) {
        res.status(400).send("Invalid place longitude");
        return false;
    }
    if (placeDescription && placeDescription.length > 100) {
        res.status(400).send("Invalid place description");
        return false;
    }
    inputToValidate.placeDescription = placeDescription ?? null;
    if (!title || title.length > 50) {
        res.status(400).send("Invalid title");
        return false;
    }
    if (playersMax && (isNaN(playersMax) || playersMax < 1)) {
        res.status(400).send("Invalid max players");
        return false;
    }
    inputToValidate.playersMax = playersMax ?? null;
    if (playersOut && (isNaN(playersOut) || playersOut < 0)) {
        res.status(400).send("Invalid out players");
        return false;
    }
    inputToValidate.playersOut = playersOut ?? null;
    if (gameLevel && (isNaN(gameLevel) || gameLevel < 1)) {
        res.status(400).send("Invalid characters level");
        return false;
    }
    inputToValidate.gameLevel = gameLevel ?? null;
    if (!description || description.length > 1000) {
        res.status(400).send("Invalid description or > 1000 characters");
        return false;
    }
    const appointmentOn_string = date + ' ' + time + ':00';
    if (!moment(appointmentOn_string, 'YYYY-MM-DD HH:mm:ss', true).isValid()) {
        res.status(400).send("Invalid date and time");
        return false;
    }

    return inputToValidate;
}
