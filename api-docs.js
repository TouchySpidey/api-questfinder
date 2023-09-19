const docs = require('./docs.json')

module.exports = (app) => {
    app.get('/api-docs', (req, res) => {
        res.send(docs);
    });
    app.get('/api-docs.html', (req, res) => {
        res.sendFile(__dirname + '/api-docs.html');
    });
};