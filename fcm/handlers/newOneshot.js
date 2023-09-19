module.exports = messageContent => {
    // New oneshot at ${place.city} on ${date.format('italian')} at ${time} using {system}
    /*
    messageContent = {
        oneshot: {
            place,
            date,
            time,
            owner,
            system
        },
        , 
    }
    */
    const { oneshot } = messageContent;
    const { place, date, time, owner, system } = oneshot;

    // place is a string that google places api can parse into a place, from which i'll get the city it's in and the coordinates
    // get whole list of notifications subscribers with "newOneshot" as type
    // for each subscriber, check if the date and time of the oneshot are in the range of the subscriber's preferences
    // if so, also check if the place is within radius of the subscriber's preferred city
    // if so, get token from db and add it to the list of tokens to send the notification to
    

}