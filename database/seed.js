const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runSeed() {
    console.log('Starting database seed...');
    
    let connection;
    try {
        // We first connect without specifying the database to create it if it doesn't exist
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        const dbName = process.env.DB_NAME || 'vendorbridge';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.query(`USE \`${dbName}\``);
        console.log(`Using database: ${dbName}`);

        // Read schema file
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema queries
        // Split by semicolon, but this simple split might fail if there are semicolons inside strings.
        // For schema.sql, assuming standard statements separated by ;\n
        const statements = schema
            .replace(/--.*?(\n|$)/g, '') // Remove single-line comments
            .split(/;\s*$/m)
            .filter(stmt => stmt.trim().length > 0);

        for (let stmt of statements) {
            // Check if this is one of the INSERT statements for users to hash passwords
            if (stmt.trim().toUpperCase().startsWith('INSERT IGNORE INTO USERS')) {
                // We will handle user seeding manually to ensure password hashing
                continue;
            }
            if (stmt.trim().toUpperCase().startsWith('CREATE DATABASE') || stmt.trim().toUpperCase().startsWith('USE ')) {
                continue; // Already handled
            }
            try {
                await connection.query(stmt);
            } catch (err) {
                console.error(`Error executing statement: ${stmt.substring(0, 50)}...`, err.message);
            }
        }

        console.log('Schema created successfully.');

        // Seed users with hashed passwords
        console.log('Seeding users...');
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
        console.log('Users seeded successfully.');

        console.log('Seed completed successfully!');
    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
        process.exit();
    }
}

runSeed();
