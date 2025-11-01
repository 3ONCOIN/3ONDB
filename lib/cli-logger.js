const chalk = require('chalk');

const log = {
  info: (msg) => process.stdout.write(chalk.blue(msg) + '\n'),
  success: (msg) => process.stdout.write(chalk.green(msg) + '\n'),
  error: (msg) => process.stderr.write(chalk.red(msg) + '\n'),
  warning: (msg) => process.stdout.write(chalk.yellow(msg) + '\n'),
  quantum: (msg) => process.stdout.write(chalk.magenta(msg) + '\n'),
};

module.exports = log;
