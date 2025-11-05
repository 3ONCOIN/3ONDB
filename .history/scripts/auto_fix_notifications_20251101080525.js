#!/usr/bin/env node
// Simple automation: normalize showNotification(...) to window.showNotification(...) and
// replace empty catch blocks with `catch(e){ void e; }` across .js/.jsx files.
// Skips files that define their own showNotification function.

const fs = require('fs');
const path = require('path');
const log = require('../lib/cli-logger.js');

const ROOT = path.resolve(__dirname, '..');
const IGNORED_DIRS = ['node_modules', '.git', '.next', '.history', 'coverage'];
const FILE_EXTS = ['.js', '.jsx'];

function shouldIgnoreDir(name){
  return IGNORED_DIRS.includes(name);
}

function walk(dir){
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for(const ent of entries){
    if(ent.isDirectory()){
      if(shouldIgnoreDir(ent.name)) continue;
      files.push(...walk(path.join(dir, ent.name)));
    } else if(ent.isFile()){
      if(FILE_EXTS.includes(path.extname(ent.name))) files.push(path.join(dir, ent.name));
    }
  }
  return files;
}

function processFile(filePath){
  const src = fs.readFileSync(filePath, 'utf8');
  // Skip if local showNotification is defined
  if(/function\s+showNotification\s*\(|(const|let|var)\s+showNotification\s*=/.test(src)){
    return false;
  }

  let out = src;

  // Replace occurrences of standalone showNotification(  -> window.showNotification(
  // Avoid property access like obj.showNotification
  out = out.replace(/(?<![.\w])showNotification\s*\(/g, 'window.showNotification(');

  // Normalize empty catches: catch(e){}  or catch (e) {} -> catch(e){ void e; }
  out = out.replace(/catch\s*\(\s*([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\)\s*\{\s*\}/g, 'catch($1){ void $1; }');

  if(out !== src){
    fs.writeFileSync(filePath, out, 'utf8');
    log.info('Patched:', path.relative(ROOT, filePath));
    return true;
  }
  return false;
}

function main(){
  log.info('Scanning for files...');
  const files = walk(ROOT);
  log.info('Files found:', files.length);
  let changed = 0;
  for(const f of files){
    try{
      if(processFile(f)) changed++;
    }catch(err){
      log.error('Error processing', f, err.message);
    }
  }
  log.info(`Done. Files changed: ${changed}`);
}

main();
