const mysql = require('mysql2');

module.exports = async (app) => {
    try {
        const dbConfig = {
            host: process.env.QUESTFINDER_DB_HOST,
            user: process.env.QUESTFINDER_DB_USER,
            password: process.env.QUESTFINDER_DB_PSWD,
            database: process.env.QUESTFINDER_DB_NAME,
        };
        const pool = mysql.createPool(dbConfig);
        global._db = pool;
        global.db = pool.promise();
        console.log('Database connection established');
    } catch (error) {
        console.error('Database connection failed');
        process.exit(1);
    }
}
