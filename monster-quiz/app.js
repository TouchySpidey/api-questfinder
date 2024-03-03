const express = require('express');
const path = require('path');

module.exports = (app, server) => {
    // handle routes
    app.use('/monster-quiz', require('./router'));
}