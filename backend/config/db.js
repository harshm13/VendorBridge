const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const dbStore = require('../services/dbStore');

let pool = null;
let useMySQL = false;
let checkDone = false;

// Initialize MySQL pool attempt
try {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'vendorbridge',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 2000
    });

    pool.getConnection()
        .then(connection => {
            useMySQL = true;
            checkDone = true;
            console.log('Successfully connected to live MySQL database engine.');
            connection.release();
        })
        .catch(err => {
            useMySQL = false;
            checkDone = true;
            console.log('MySQL server not active (' + err.message + '). Seamlessly activated High-Speed Persistent Hybrid JSON Store.');
        });
} catch (err) {
    useMySQL = false;
    checkDone = true;
    console.log('MySQL pool init exception. Using Persistent Hybrid JSON Store.');
}

const db = {
    query: async (sql, params = []) => {
        if (useMySQL && pool) {
            try {
                return await pool.query(sql, params);
            } catch (err) {
                console.warn('MySQL query failed, falling back to dbStore:', err.message);
                return await dbStore.query(sql, params);
            }
        }
        return await dbStore.query(sql, params);
    },

    getConnection: async () => {
        if (useMySQL && pool) {
            try {
                return await pool.getConnection();
            } catch (err) {
                console.warn('MySQL getConnection failed, falling back to dbStore connection:', err.message);
                return dbStore.getConnection();
            }
        }
        return dbStore.getConnection();
    },

    isLiveMySQL: () => useMySQL,
    getMode: () => (useMySQL ? 'mysql' : 'hybrid_json_store')
};

module.exports = db;
