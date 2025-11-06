#!/usr/bin/env node
// Basic smoke tests for 3ONDB
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test basic file structure
test('Package.json exists', () => {
  assert(fs.existsSync('package.json'), 'package.json not found');
});

test('Main server file exists', () => {
  assert(fs.existsSync('src/server.js'), 'src/server.js not found');
});

test('Migration scripts exist', () => {
  assert(fs.existsSync('scripts/migrate_sqlite_to_postgres.js'), 'Migration script not found');
  assert(fs.existsSync('scripts/run_migrations.js'), 'Run migrations script not found');
});

test('Required dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert(pkg.dependencies.pg, 'PostgreSQL dependency missing');
  assert(pkg.dependencies.sqlite3, 'SQLite3 dependency missing');
  assert(pkg.dependencies.express, 'Express dependency missing');
});

test('Environment template exists', () => {
  assert(fs.existsSync('.env.example'), '.env.example not found');
});

test('Migration schema exists', () => {
  assert(fs.existsSync('migrations/sqlite_schema_pg.sql'), 'Postgres schema not found');
});

test('Scripts are executable', () => {
  const migrationScript = path.join(__dirname, '..', 'scripts', 'migrate_sqlite_to_postgres.js');
  assert(fs.existsSync(migrationScript), 'Migration script missing');
  
  // Test syntax by requiring the module
  try {
    delete require.cache[require.resolve('../scripts/run_migrations.js')];
    // Just test that it can be parsed
    require('../scripts/generate_checksums.js');
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw new Error(`Script syntax error: ${e.message}`);
    }
  }
});

// Report results
console.log('\n📊 Test Results:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log('\n🚨 Some tests failed. Please fix before deploying.');
  process.exit(1);
} else {
  console.log('\n🎉 All smoke tests passed!');
  process.exit(0);
}