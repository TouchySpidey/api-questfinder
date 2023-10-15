const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

global.getSecretFromManager = async (name) => {
    // Run request
    const [response] = await client.accessSecretVersion({name});
    const payload = response.payload.data.toString('utf8');
    return payload;
}
const initMapsClient = async () => {
    const googleMapsAPIKey = await global.getSecretFromManager(`projects/975858570575/secrets/MAPS-APIKEY/versions/latest`);
    global.googleMapsClient = require('@google/maps').createClient({
        key: googleMapsAPIKey,
        Promise: Promise
    });
}
initMapsClient();