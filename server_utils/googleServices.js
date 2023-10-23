const googleMapsAPIKey = process.env.QUESTFINDER_MAPS_APIKEY;
global.googleMapsClient = require('@google/maps').createClient({
    key: googleMapsAPIKey,
    Promise: Promise
});

// need to test if it works, or else kill the server
global.googleMapsClient.geocode({address: 'Easter Island'})
.asPromise()
.then((response) => {
    console.log('google api works fine');
})
.catch((err) => {
    console.error(err.json);
    throw err;
});