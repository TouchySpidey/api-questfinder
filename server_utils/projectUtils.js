const statuses = require('./projectUtils/statuses');
const oneshot = require('./projectUtils/oneshot');
const chat = require('./projectUtils/chat');
const notificationPreferences = require('./projectUtils/notificationPreferences');

module.exports = {
    statuses,
    ...oneshot,
    ...chat,
    ...notificationPreferences,
}
