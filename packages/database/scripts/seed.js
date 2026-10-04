const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function seed() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL environment variable is missing.');
        process.exit(1);
    }

    const client = new Client({ connectionString });
    await client.connect();

    console.log('Connected to database. Running seed scripts...');

    const seedDir = path.join(__dirname, '..', 'seed');
    const files = fs.readdirSync(seedDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
        console.log(`Executing seed ${file}...`);
        const filePath = path.join(seedDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        try {
            await client.query(sql);
            console.log(`Successfully seeded ${file}`);
        } catch (err) {
            console.error(`Error applying seed ${file}:`, err.message);
            process.exit(1);
        }
    }

    console.log('All seed data applied successfully.');
    await client.end();
}

seed();
