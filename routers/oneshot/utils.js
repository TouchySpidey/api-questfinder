module.exports.buildQuery = (validatedQuery) => {
    try {
        const { days, place, radius, system, time } = validatedQuery;
        
        let query = 'SELECT oneshots.* FROM oneshots WHERE isDeleted = 0';
        if (days) {
            query += ` AND WEEKDAY(appointmentOn) + 1 IN (${ days.join(',') })`;
        }
        if (time) {
            query += ` AND TIME(appointmentOn) BETWEEN '${ time.from }' AND '${ time.to }'`;
        }
        if (place) {
            query += ` AND ST_Distance_Sphere(POINT(placeLat, placeLng), POINT(${ place.lat }, ${ place.lng })) / 1000 <= ${ radius + 1 }`;
        }
        // if (system) { // TODO: implement systems
        //     query += ` AND system IN (${ system.join(',') })`;
        // }
        query += ' ORDER BY appointmentOn ASC';

        return query;
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