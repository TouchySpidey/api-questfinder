const express = require('express');
const appRouter = express.Router();

appRouter.get('/', (req, res) => {
    res.send(`Bookpack API, server v ${process.env.npm_package_version}`);
});

module.exports = appRouter;