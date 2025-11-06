// Simple CLI logger for scripts
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const colors = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m',  // yellow
  info: '\x1b[36m',  // cyan
  debug: '\x1b[90m', // gray
  reset: '\x1b[0m'
};

function log(level, ...args) {
  const color = colors[level] || colors.reset;
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${level.toUpperCase()}:${colors.reset}`, ...args);
}

module.exports = {
  error: (...args) => log('error', ...args),
  warn: (...args) => log('warn', ...args),
  warning: (...args) => log('warn', ...args),
  info: (...args) => log('info', ...args),
  debug: (...args) => log('debug', ...args)
};