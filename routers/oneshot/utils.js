module.exports.getList = async (validatedQuery, userUID = null) => {
    try {
        const { days, place, radius, system, time } = validatedQuery;

        const query = `SELECT oneshots.*, master.nickname AS masterNickname, join_requests.status AS joinStatus, appointmentOn < UTC_TIMESTAMP() AS isPast
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
        if (time) {
            params.timeFrom = time.from;
            params.timeTo = time.to;
        } else {
            params.skipTime = 1;
        }
        if (place) {
            params.placeLat = place.lat;
            params.placeLng = place.lng;
            params.radius = radius;
        } else {
            params.skipPlace = 1;
        }

        const queryParams = [
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
        
        return oneshots;
    } catch (error) {
        console.error(error);
    }
}

module.exports.validateQuery = (queryToValidate) => {
    const { days, place, radius, system, time } = queryToValidate;
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
    if (place && (!place.lat || !place.lng || !radius || isNaN(radius) || radius < 0)) {
        return false;
    }
    if (radius && (isNaN(radius) || radius < 0 || !place || !place.lat || !place.lng)) {
        return false;
    }
    if (place) {
        place.lat = parseFloat(place.lat);
        place.lng = parseFloat(place.lng);
        if (place.lat < -90 || place.lat > 90 || place.lng < -180 || place.lng > 180) {
            return false;
        }
        if (radius < 0) {
            queryToValidate.radius = -radius;
        }
    }
    if (system && !Array.isArray(system)) {
        return false;
    }
    if (time && (!time.from || !time.to || !moment(time.from, 'HH:mm', true).isValid() || !moment(time.to, 'HH:mm', true).isValid())) {
        return false;
    }

    return queryToValidate;
}