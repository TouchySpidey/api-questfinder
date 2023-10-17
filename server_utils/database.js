const mysql = require('mysql2');

module.exports = async (app) => {
    try {
        const dbConfig = await global.getSecretFromManager(`projects/975858570575/secrets/DB-${global.APP_ENVIRONMENT}/versions/latest`);
        const pool = mysql.createPool(JSON.parse(dbConfig));
        global._db = pool;
        global.db = pool.promise();
        console.log('Database connection established');
    } catch (error) {
        console.error('Database connection failed');
        process.exit(1);
    }
}
