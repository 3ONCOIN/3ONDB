const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const sqlitePath = process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), 'data', '3on.sqlite');
const outDir = path.resolve(process.cwd(), 'migrations');
const outFile = path.join(outDir, 'sqlite_schema_pg.sql');

function transformCreateTable(sql) {
  if (!sql) return '';
  let s = sql;
  // Convert AUTOINCREMENT -> (remove)
  s = s.replace(/AUTOINCREMENT/ig, '');
  // Convert INTEGER PRIMARY KEY to SERIAL PRIMARY KEY when appropriate
  s = s.replace(/INTEGER\s+PRIMARY\s+KEY/ig, 'SERIAL PRIMARY KEY');
  // Replace " with " for safety (keep identifiers quoted)
  // SQLite allows types like TEXT, VARCHAR(n) - keep as-is but remove DOUBLE ""
  // Remove unsupported "WITHOUT ROWID" if present
  s = s.replace(/WITHOUT ROWID/ig, '');
  // Very small cleanup: collapse multiple spaces
  s = s.replace(/\s+/g, ' ');
  return s.trim() + ';\n\n';
}

function transformIndex(sql) {
  if (!sql) return '';
  let s = sql;
  // SQLite index SQL often works in Postgres; remove IF NOT EXISTS tokens if problematic
  s = s.replace(/IF NOT EXISTS/ig, 'IF NOT EXISTS');
  s = s.replace(/AUTOINCREMENT/ig, '');
  s = s.replace(/\s+/g, ' ');
  return s.trim() + ';\n\n';
}

async function dump() {
  if (!fs.existsSync(sqlitePath)) {
    console.error('SQLite DB not found at', sqlitePath);
    process.exit(2);
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const db = new sqlite3.Database(sqlitePath);

  db.serialize(() => {
    db.all("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql NOT NULL ORDER BY type='table' DESC, name", (err, rows) => {
      if (err) {
        console.error('Error reading sqlite_master:', err);
        process.exit(3);
      }

      let out = '-- Translated Postgres DDL generated from SQLite schema\n-- Review and adjust types, constraints, and FKs before applying to Postgres.\n\n';

      // First, tables
      rows.filter(r => r.type === 'table').forEach(r => {
        out += `-- original: ${r.name}\n`;
        out += transformCreateTable(r.sql);
      });

      // Then indexes
      rows.filter(r => r.type === 'index').forEach(r => {
        out += `-- index: ${r.name} on ${r.tbl_name}\n`;
        out += transformIndex(r.sql);
      });

      fs.writeFileSync(outFile, out, 'utf8');
      console.log('Wrote', outFile);
      db.close();
    });
  });
}

dump();
