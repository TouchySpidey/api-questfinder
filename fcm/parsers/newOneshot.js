module.exports = preferences => {
    /*
    preferences: {
        city: "Spresiano",
        radius: 10,
        weekGrid: [
            ["tuesday", 19, 23],
        ],
    }
    */
    const { city, radius, weekGrid } = preferences;
    if (!city || !radius || !weekGrid) {
        return null;
    }

    const weekGridObj = {};
}