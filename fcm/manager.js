module.exports = (messageType, messageContent) => {
    
    if (!messageType in messageTypes) {
        console.log('Unhandled message type: ' + messageType);
        return;
    }
    
    const handler = messageTypes[messageType];
    const result = handler(messageContent);
    
    if (!result.success || !result.message) {
        // handler failed, log why and stop here
        if (result.reason) console.log('Message handler failed: ' + result.reason);
        else console.log('Message handler failed for unknown reason');
    }

    // handler succeeded, send message
    const message = { data, tokens } = result.message;

    // Send a message to the device corresponding to the provided registration token.
    getMessaging().sendMulticast(message)

}