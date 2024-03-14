const mysql = require('mysql2');
global.mysql = mysql;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async (app) => {
    try {
        await sleep(3000); // let the dns start
        const dbConfig = {
            host: process.env.QUESTFINDER_DB_HOST,
            port: process.env.QUESTFINDER_DB_PORT,
            user: process.env.QUESTFINDER_DB_USER,
            password: process.env.QUESTFINDER_DB_PSWD,
            database: process.env.QUESTFINDER_DB_NAME,
            timezone: 'Z',
        };
        if (process.env.QUESTFINDER_DB_SSL == 'true') {
            dbConfig.ssl = {
                rejectUnauthorized: true,
            };
        }
        console.log('Initializing database connection...');
        console.log(dbConfig);
        const pool = mysql.createPool(dbConfig);
        global._db = pool;
        global.db = pool.promise();
        await global.db.execute('SELECT 1');
        console.log('Database connection established');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}
