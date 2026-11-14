const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runSeed() {
    console.log('Starting database seed...');

    // 1. Generate runtime database/data.json from database/data.seed.json
    const seedPath = path.join(__dirname, '../database/data.seed.json');
    const runtimePath = path.join(__dirname, '../database/data.json');

    try {
        if (fs.existsSync(seedPath)) {
            fs.copyFileSync(seedPath, runtimePath);
            console.log('Successfully generated runtime database/data.json from database/data.seed.json');
        } else {
            console.warn('Warning: database/data.seed.json not found.');
        }
    } catch (err) {
        console.error('Failed to copy seed file:', err.message);
    }

    // 2. Attempt MySQL schema & user provisioning if MySQL server is available
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT, 10) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            connectTimeout: 2000
        });

        const dbName = process.env.DB_NAME || 'vendorbridge';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.query(`USE \`${dbName}\``);
        console.log(`Using MySQL database: ${dbName}`);

        // Read schema file
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');

            const statements = schema
                .replace(/--.*?(\n|$)/g, '')
                .split(/;\s*$/m)
                .filter(stmt => stmt.trim().length > 0);

            for (let stmt of statements) {
                if (stmt.trim().toUpperCase().startsWith('INSERT IGNORE INTO USERS')) {
                    continue;
                }
                if (stmt.trim().toUpperCase().startsWith('CREATE DATABASE') || stmt.trim().toUpperCase().startsWith('USE ')) {
                    continue;
                }
                try {
                    await connection.query(stmt);
                } catch (err) {
                    console.error(`Error executing statement: ${stmt.substring(0, 50)}...`, err.message);
                }
            }
            console.log('MySQL schema created successfully.');
        }

        // Seed users with hashed passwords
        console.log('Seeding MySQL users...');
        const users = [
            { id: 1, name: 'Admin User', email: 'admin@vendorbridge.com', password: 'admin123', role: 'admin' },
            { id: 2, name: 'Manager Approver', email: 'manager@vendorbridge.com', password: 'manager123', role: 'manager' },
            { id: 3, name: 'Procurement Officer', email: 'procurement@vendorbridge.com', password: 'procurement123', role: 'procurement_officer' },
            { id: 4, name: 'ABC Vendor', email: 'abc@suppliers.com', password: 'vendor123', role: 'vendor' }
        ];

        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await connection.query(
                `INSERT IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)`,
                [user.id, user.name, user.email, hashedPassword, user.role]
            );
        }
        console.log('MySQL users seeded successfully.');
        console.log('MySQL seed completed successfully!');
    } catch (error) {
        console.log(`MySQL server not active or unreachable (${error.message}). Hybrid JSON Store initialized at database/data.json.`);
    } finally {
        if (connection) {
            await connection.end();
        }
        console.log('Database seeding finished.');
    }
}

if (require.main === module) {
    runSeed().then(() => process.exit(0)).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = runSeed;
