#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const migrationsDir = path.join(__dirname, '../migrations/pg');
const checksumFile = path.join(__dirname, '../migrations/checksums.json');

function generateChecksums() {
  console.log('Generating migration checksums...');
  
  // Ensure migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    console.log('Created migrations directory:', migrationsDir);
  }

  // Read all SQL migration files
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const checksums = {};
  
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    checksums[file] = checksum;
    console.log(`  ${file}: ${checksum}`);
  }

  // Write checksums to file
  fs.writeFileSync(checksumFile, JSON.stringify(checksums, null, 2));
  console.log(`Checksums written to: ${checksumFile}`);
  console.log(`Total migrations: ${files.length}`);
}

if (require.main === module) {
  generateChecksums();
}

module.exports = { generateChecksums };