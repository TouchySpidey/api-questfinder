const firebaseAdmin = require('firebase-admin');
const db = firebaseAdmin.database();

exports.postOneshot = async (req, res) => {
    const uid = req.uid;  // Authenticated user's UID
    const {
        date,
        place,
        title,
        description,
        time,
        max_players,
        out_players,
        characters_level,
        extra_info
    } = req.body;

    const validationResult = validateOneshotInput(res, req.body);
    if (validationResult) return;

    try {
        // timestamp in format YYYY-MM-DD HH:MM:SS
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const newOneshot = {
            timestamp,
            owner: uid,
            date,
            place,
            title,
            description,
            time,
            max_players,
            out_players,
            characters_level,
            extra_info,
            previous_versions: {}
        };

        // Save the oneshot data in Firebase and get the auto-generated key
        const oneshotsRef = db.ref('oneshots');
        const newOneshotRef = oneshotsRef.push();
        await newOneshotRef.set(newOneshot);

        const oneshotUID = newOneshotRef.key;  // Firebase auto-generated key

        // You could also update a list of oneshots owned by the user, if needed

        res.status(201).json({ message: "Oneshot created successfully", oneshotUID });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

exports.viewOneshot = async (req, res) => {
    const oneshotUID = req.params.oneshotUID;  // Assuming the UID is passed as a URL parameter

    try {
        const oneshotRef = db.ref(`oneshots/${oneshotUID}`);
        const snapshot = await oneshotRef.once("value");
        const oneshotData = snapshot.val();

        if (!oneshotData) {
            return res.status(404).send("Oneshot not found");
        }

        // Get the number of 'present' and 'tentative' participants
        const participationRef = db.ref(`participations`);
        const participationSnapshot = await participationRef.orderByChild("oneshot").equalTo(oneshotUID).once("value");
        const participationData = participationSnapshot.val();

        let presentPlayers = 0;
        let tentativePlayers = 0;

        if (participationData) {
            presentPlayers = Object.values(participationData).filter(p => p.status === 'present').length;
            tentativePlayers = Object.values(participationData).filter(p => p.status === 'tentative').length;
        }

        // Add the counts to the response
        oneshotData.present_players = presentPlayers;
        oneshotData.tentative_players = tentativePlayers;

        res.status(200).json(oneshotData);

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

exports.editOneshot = async (req, res) => {
    const uid = req.uid; // Authenticated user's UID
    const oneshotUID = req.params.oneshotUID; // Assuming the UID is passed as a URL parameter
    const {
        date,
        place,
        title,
        description,
        time,
        max_players,
        out_players,
        characters_level,
        extra_info
    } = req.body;

    const validationResult = validateOneshotInput(res, req.body);
    if (validationResult) return;

    try {
        const oneshotRef = db.ref(`oneshots/${oneshotUID}`);
        const snapshot = await oneshotRef.once("value");
        const oneshotData = snapshot.val();

        if (!oneshotData) {
            return res.status(404).send("Oneshot not found");
        }

        if (oneshotData.owner !== uid) {
            return res.status(403).send("Permission denied");
        }

        // Store the previous version
        if (!oneshotData.previous_versions) {
            oneshotData.previous_versions = {};
        }
        const timestamp = new Date().toISOString();
        oneshotData.previous_versions[timestamp] = {
            timestamp: oneshotData.timestamp,
            date: oneshotData.date,
            place: oneshotData.place,
            title: oneshotData.title,
            description: oneshotData.description,
            time: oneshotData.time,
            max_players: oneshotData.max_players,
            out_players: oneshotData.out_players,
            characters_level: oneshotData.characters_level,
            extra_info: oneshotData.extra_info,
        };

        const updatedOneshot = {
            // Update only the fields that are provided
            ...oneshotData,
            ...{ timestamp },
            ...(date && { date }),
            ...(place && { place }),
            ...(title && { title }),
            ...(description && { description }),
            ...(time && { time }),
            ...(max_players && { max_players }),
            ...(out_players && { out_players }),
            ...(characters_level && { characters_level }),
            ...(extra_info && { extra_info }),
        };

        await oneshotRef.update(updatedOneshot);
        res.status(200).json({ message: "Oneshot updated successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

exports.deleteOneshot = async (req, res) => {
    const uid = req.uid;  // Authenticated user's UID
    const oneshotUID = req.params.oneshotUID;  // Assuming the UID is passed as a URL parameter

    try {
        const oneshotRef = db.ref(`oneshots/${oneshotUID}`);
        const snapshot = await oneshotRef.once("value");
        const oneshotData = snapshot.val();

        if (!oneshotData) {
            return res.status(404).send("Oneshot not found");
        }

        if (oneshotData.owner !== uid) {
            return res.status(403).send("Permission denied");
        }

        // Store the previous version
        if (!oneshotData.previous_versions) {
            oneshotData.previous_versions = {};
        }
        const timestamp = new Date().toISOString();
        oneshotData.previous_versions[timestamp] = { ...oneshotData };

        // Perform the soft delete by setting a 'is_deleted' flag
        await oneshotRef.update({ is_deleted: true });

        res.status(200).send("Oneshot deleted successfully");

    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

const handleParticipationStatus = async (status, uid, oneshotUID, res) => {
    // Fetch the oneshot data to check the max_players
    const oneshotRef = db.ref(`oneshots/${oneshotUID}`);
    const snapOneshot = await oneshotRef.once("value");
    const oneshotData = snapOneshot.val();

    if (!oneshotData) {
        return res.status(404).send("Oneshot not found");
    }

    if (oneshotData.owner === uid) {
        return res.status(403).send("You're the owner, you can't interact with the oneshot");
    }
    
    const participationRef = db.ref(`participations`);
    const query = participationRef.orderByChild("oneshot").equalTo(oneshotUID);
    const snapshot = await query.once("value");
    let participationData = snapshot.val();
    let existingParticipationKey = null;
    let numberOfParticipants = 0;

    if (participationData) {
        Object.keys(participationData).forEach(key => {
            if (participationData[key].user === uid) {
                existingParticipationKey = key;
            }
            if (participationData[key].status === 'present') {
                numberOfParticipants++;
            }
        });
    }

    if (numberOfParticipants >= oneshotData.max_players && status === 'present') {
        return res.status(403).send("Oneshot is full");
    }

    if (existingParticipationKey) {
        const existingParticipation = participationData[existingParticipationKey];
        if (!existingParticipation.previous_versions) {
            existingParticipation.previous_versions = {};
        }
        const timestamp = new Date().toISOString();
        existingParticipation.previous_versions[timestamp] = { ...existingParticipation };

        existingParticipation.status = status;
        existingParticipation.timestamp = new Date().toISOString();

        await participationRef.child(existingParticipationKey).update(existingParticipation);

    } else {
        const newParticipation = {
            oneshot: oneshotUID,
            user: uid,
            timestamp: new Date().toISOString(),
            status,
            previous_versions: {}
        };

        await participationRef.push().set(newParticipation);
    }

    res.status(200).send(`Successfully set status to ${status}`);
};

exports.joinOneshot = async (req, res) => {
    const uid = req.uid;
    const oneshotUID = req.params.oneshotUID;
    await handleParticipationStatus('present', uid, oneshotUID, res);
};

exports.setTentative = async (req, res) => {
    const uid = req.uid;
    const oneshotUID = req.params.oneshotUID;
    await handleParticipationStatus('tentative', uid, oneshotUID, res);
};

exports.leaveOneshot = async (req, res) => {
    const uid = req.uid;
    const oneshotUID = req.params.oneshotUID;
    await handleParticipationStatus('leave', uid, oneshotUID, res);
};

function validateOneshotInput(res, { date, time, title, max_players, out_players, characters_level, description, extra_info }) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).send("Invalid date format");
    }
    if (!time || !/^\d{2}:\d{2}:\d{2}$/.test(time)) {
        return res.status(400).send("Invalid time format");
    }
    if (!title || title.length > 50) {
        return res.status(400).send("Invalid title");
    }
    if (!max_players || isNaN(max_players) || max_players < 1) {
        return res.status(400).send("Invalid max players");
    }
    if (!out_players || isNaN(out_players) || out_players < 0) {
        return res.status(400).send("Invalid out players");
    }
    if (!characters_level || isNaN(characters_level) || characters_level < 1) {
        return res.status(400).send("Invalid characters level");
    }
    if (!description || description.length > 500) {
        return res.status(400).send("Invalid description or > 500 characters");
    }
    if (!extra_info || extra_info.length > 500) {
        return res.status(400).send("Invalid extra info or > 500 characters");
    }

    return null;  // return null if all validations pass
}
