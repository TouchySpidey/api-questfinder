const parsers = require.main.require('./fcm/parsers');

exports.subscribe = async (req, res) => {
    const { token, type, preferences, viaEmail } = req.body;
    if (!token || !type || !preferences) {
        res.status(400).send('Missing required fields');
        return;
    }

    if (!parsers[type]) {
        res.status(400).send('Invalid type');
        return;
    }

    const parsedPreferences = parsers[type](preferences);
    if (!parsedPreferences) {
        res.status(400).send('Invalid preferences');
        return;
    }

    const newSub = {
        token,
        type,
        email: viaEmail ? req.email : null,
        ...parsedPreferences,
    };

    const notificationSubsRef = global.db.ref('notificationSubs');
    const newSubRef = notificationSubsRef.push();
    await newSubRef.set(newSub);

    res.status(201).json({ message: "Subscribed" });
}

exports.unsubscribe = (req, res) => {
    const { subUID } = req.params;
    if (!subUID) {
        res.status(400).send('Missing required fields');
        return;
    }
    
    const notificationSubsRef = global.db.ref('notificationSubs');
    const notificantionSub = notificationSubsRef.child(subUID);

    if (!notificantionSub) {
        res.status(404).send('Subscription not found');
        return;
    }

    notificantionSub.remove();
    res.status(200).json({ message: "Unsubscribed" });
}