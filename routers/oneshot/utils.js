const moment = require('moment');
const { statuses } = require('./interactionController');

module.exports.search = async (validatedQuery, userUID = null) => {
    try {
        const { days, placeLat, placeLng, radius, system, timeFrom, timeTo } = validatedQuery;

        const query = `SELECT oneshots.*,
        master.nickname AS masterNickname,
        join_requests.status AS joinStatus,
        appointmentOn < UTC_TIMESTAMP() AS isPast,
        ST_Distance_Sphere(POINT(placeLat, placeLng), POINT(?, ?)) / 1000 AS distance
        FROM oneshots
        LEFT JOIN join_requests ON oneshots.UID = join_requests.oneshotUID AND join_requests.userUID = ?
        LEFT JOIN users master ON master.UID = oneshots.masterUID
        WHERE isDeleted = 0
        AND (? = 1 OR WEEKDAY(appointmentOn) + 1 IN (?))
        AND (? = 1 OR TIME(appointmentOn) BETWEEN ? AND ?)
        AND (? = 1 OR ST_Distance_Sphere(POINT(placeLat, placeLng), POINT(?, ?)) / 1000 <= ?)
        ORDER BY appointmentOn ASC`;

        let params = { };
        
        if (days) {
            params.days = days.join(',');
        } else {
            params.skipDays = 1;
        }
        if (timeFrom && timeTo) {
            params.timeFrom = timeFrom;
            params.timeTo = timeTo;
        } else {
            params.skipTime = 1;
        }
        if (placeLat && placeLng && radius) {
            params.placeLat = placeLat;
            params.placeLng = placeLng;
            params.radius = radius;
        } else {
            params.skipPlace = 1;
        }

        const queryParams = [
            params.placeLat ?? null,
            params.placeLng ?? null,
            userUID ?? null,
            params.skipDays ?? 0,
            params.days ?? null,
            params.skipTime ?? 0,
            params.timeFrom ?? null,
            params.timeTo ?? null,
            params.skipPlace ?? 0,
            params.placeLat ?? null,
            params.placeLng ?? null,
            params.radius ?? null,
        ];

        const [ oneshots ] = await global.db.execute(query, queryParams);

        if (userUID) {
            // populate isMaster with a boolean value
            for (let i in oneshots) {
                oneshots[i].isMaster = oneshots[i].masterUID === userUID;
            }
        }
        
        return oneshots;
    } catch (error) {
        console.error(error);
    }
}

module.exports.validateQuery = (queryToValidate) => {
    const { days, placeLat, placeLng, radius, system, timeFrom, timeTo } = queryToValidate;
    if (days && (!Array.isArray(days) || days.length === 0)) {
        return false;
    }
    for (let i in queryToValidate.days) {
        const day = parseInt(queryToValidate.days[i]);
        if (day < 1 || day > 7) {
            return false;
        }
        queryToValidate.days[i] = day;
    }
    // query is not valid when either placeLat placeLng or radius are defined but not all of them
    if ((placeLat || placeLng || radius) && !(placeLat && placeLng && radius)) {
        return false;
    } else if (placeLat && placeLng && radius) {
        // also if they are defined all defined but any of them is not valid
        if (isNaN(placeLat) || isNaN(placeLng) || isNaN(radius)) {
            return false;
        }
        if (placeLat < -90 || placeLat > 90 || placeLng < -180 || placeLng > 180 || radius < 0) {
            return false;
        }
    }
    if (system && !Array.isArray(system)) {
        return false;
    }
    // query is not valid when either timeFrom or timeTo are defined but not both of them
    if ((timeFrom || timeTo) && !(timeFrom && timeTo)) {
        return false;
    } else if (timeFrom && timeTo) {
        // also if they are defined all defined but any of them is not valid (momentjs)
        if (!moment(timeFrom, 'HH:mm', true).isValid() || !moment(timeTo, 'HH:mm', true).isValid()) {
            return false;
        }
    }

    return queryToValidate;
}

module.exports.listOneshots = async (userUID) => {
    const [ oneshots ] = await global.db.execute(`SELECT o.*, status
    FROM oneshots o
    LEFT JOIN join_requests jr
    ON o.UID = jr.oneshotUID
    WHERE ? IN (o.masterUID, jr.userUID)`, [ userUID ]);
    return oneshots.map(oneshot => {
        oneshot.isMaster = oneshot.masterUID === userUID;
        oneshot.isIn = oneshot.status === statuses.ACCEPTED;
        oneshot.isPending = oneshot.status === statuses.PENDING;
        return oneshot;
    });
}