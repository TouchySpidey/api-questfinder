const express = require('express')
const app = express()
const port = 8080

app.get('/', (req, res) => {
    // get app version from package.json
    const appVersion = require('./package.json').version
    // set status code to 200 (OK)
    res.status(200)
    // out app version
    res.send(`Hello World 😍! v${appVersion}`)
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})