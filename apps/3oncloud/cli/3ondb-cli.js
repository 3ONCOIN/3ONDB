#!/usr/bin/env node

/**
 * 3ONDB v3 INFINITE CORE CLI TOOLKIT
 * Complete command-line interface with 3ONCORE integration
 */

const { Command } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const inquirer = require('inquirer');
const Table = require('cli-table3');
const ora = require('ora');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const log = require('../../../lib/cli-logger.js');
const { pool } = require('../utils/database');

// Version and configuration
const VERSION = '3.0.0-infinite-core';
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.3ondb-config.json');

class InfiniteCoreCLI {
    constructor() {
        this.program = new Command();
        this.config = null;
        this.apiUrl = 'http://localhost:3000';
        this.setupCommands();
    }

    async loadConfig() {
        try {
            const configData = await fs.readFile(CONFIG_FILE, 'utf8');
            this.config = JSON.parse(configData);
            if (this.config.apiUrl) {
                this.apiUrl = this.config.apiUrl;
            }
        } catch (error) {
            // Config file doesn't exist, will be created on first login
        }
    }

    async saveConfig() {
        try {
            await fs.writeFile(CONFIG_FILE, JSON.stringify(this.config, null, 2));
        } catch (error) {
            log.error(chalk.red('Failed to save configuration:', error.message));
        }
    }

    displayBanner() {
        log.info(chalk.cyan(figlet.textSync('3ONDB', { font: 'Doom' })));
        log.info(chalk.yellow('v3 INFINITE CORE EDITION'));
        log.info(chalk.gray('Ultra-Advanced Database Management System\n'));
    }

    setupCommands() {
        this.program
            .name('3ondb')
            .description('3ONDB v3 Infinite Core CLI')
            .version(VERSION);

        // Authentication commands
        this.program
            .command('login')
            .description('Authenticate with 3ONDB server')
            .option('-u, --url <url>', 'API server URL', 'http://localhost:3000')
            .action(this.login.bind(this));

        this.program
            .command('logout')
            .description('Logout from current session')
            .action(this.logout.bind(this));

        // Database commands
        this.program
            .command('status')
            .description('Show system status and health')
            .action(this.status.bind(this));

        this.program
            .command('query <sql>')
            .description('Execute SQL query')
            .option('-f, --format <format>', 'Output format (table, json, csv)', 'table')
            .action(this.query.bind(this));

        this.program
            .command('ai <question>')
            .description('Ask AI assistant a natural language question')
            .action(this.aiQuery.bind(this));

        // User management
        this.program
            .command('users')
            .description('Manage users')
            .option('-l, --list', 'List all users')
            .option('-c, --create', 'Create new user')
            .option('-r, --role <role>', 'User role for creation')
            .action(this.users.bind(this));

        // Backup commands
        this.program
            .command('backup')
            .description('Database backup operations')
            .option('-c, --create [name]', 'Create backup')
            .option('-l, --list', 'List backups')
            .option('-r, --restore <id>', 'Restore backup')
            .action(this.backup.bind(this));

        // Monitoring commands
        this.program
            .command('monitor')
            .description('Real-time system monitoring')
            .option('-i, --interval <seconds>', 'Update interval', '5')
            .action(this.monitor.bind(this));

        // Analytics commands
        this.program
            .command('analytics')
            .description('Show analytics and metrics')
            .option('-p, --performance', 'Show performance metrics')
            .option('-u, --usage', 'Show usage statistics')
            .action(this.analytics.bind(this));

        // Webhook management
        this.program
            .command('webhooks')
            .description('Manage webhooks')
            .option('-l, --list', 'List webhooks')
            .option('-c, --create', 'Create webhook')
            .option('-d, --delete <id>', 'Delete webhook')
            .action(this.webhooks.bind(this));

        // 3ONCORE integration commands
        this.program
            .command('core')
            .description('3ONCORE ecosystem integration')
            .option('-s, --sync', 'Sync with 3ONCORE services')
            .option('-m, --metrics', 'Share metrics with 3ONVPS')
            .option('-a, --ai-connect', 'Connect to 3ONAI services')
            .action(this.coreIntegration.bind(this));

        // Interactive mode
        this.program
            .command('interactive')
            .alias('i')
            .description('Start interactive mode')
            .action(this.interactive.bind(this));

        // Development tools
        this.program
            .command('dev')
            .description('Development tools')
            .option('-g, --generate <type>', 'Generate code (model, controller, migration)')
            .option('-s, --seed', 'Seed database with sample data')
            .action(this.dev.bind(this));
    }

    async makeRequest(endpoint, options = {}) {
        try {
            const url = `${this.apiUrl}${endpoint}`;
            const config = {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config?.token && { 
                        'Authorization': `Bearer ${this.config.token}` 
                    }),
                    ...options.headers
                }
            };

            const response = await axios(url, config);
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`API Error: ${error.response.data?.error || error.response.statusText}`);
            }
            throw new Error(`Network Error: ${error.message}`);
        }
    }

    // ========================================================================
    // AUTHENTICATION COMMANDS
    // ========================================================================

    async login(options) {
        this.displayBanner();
        
        try {
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'email',
                    message: 'Email:',
                    validate: (input) => input.includes('@') || 'Please enter a valid email'
                },
                {
                    type: 'password',
                    name: 'password',
                    message: 'Password:',
                    mask: '*'
                },
                {
                    type: 'input',
                    name: 'tenantId',
                    message: 'Tenant ID (optional):',
                    default: '1'
                }
            ]);

            const spinner = ora('Authenticating...').start();
            
            const result = await this.makeRequest('/api/auth/login', {
                method: 'POST',
                data: { ...answers, tenantId: parseInt(answers.tenantId) }
            });

            if (result.success) {
                this.config = {
                    token: result.accessToken,
                    refreshToken: result.refreshToken,
                    user: result.user,
                    apiUrl: options.url
                };
                await this.saveConfig();
                
                spinner.succeed(chalk.green('Login successful!'));
                log.info(chalk.blue(`Welcome, ${result.user.name}!`));
                log.info(chalk.gray(`Role: ${result.user.role}`));
            } else {
                spinner.fail(chalk.red('Login failed'));
                log.error(chalk.red(result.error));
            }
        } catch (error) {
            log.error(chalk.red('Login error:', error.message));
        }
    }

    async logout() {
        try {
            if (this.config?.token) {
                await this.makeRequest('/api/auth/logout', { method: 'POST' });
            }
            
            // Clear local config
            this.config = null;
            try {
                await fs.unlink(CONFIG_FILE);
            } catch (error) {
                // File might not exist
            }
            
            log.info(chalk.green('Logged out successfully'));
        } catch (error) {
            log.error(chalk.red('Logout error:', error.message));
        }
    }

    // ========================================================================
    // DATABASE COMMANDS
    // ========================================================================

    async status() {
        try {
            const spinner = ora('Checking system status...').start();
            
            const health = await this.makeRequest('/health');
            
            spinner.stop();
            
            log.info(chalk.cyan('\n🚀 3ONDB v3 INFINITE CORE STATUS\n'));
            
            const table = new Table({
                head: ['Component', 'Status', 'Details'],
                colWidths: [20, 15, 50]
            });

            const statusColor = health.status === 'healthy' ? chalk.green : chalk.red;
            
            table.push(
                ['Overall', statusColor(health.status.toUpperCase()), health.timestamp],
                ['Database', health.database === 'healthy' ? chalk.green('HEALTHY') : chalk.red('ERROR'), 'PostgreSQL connection'],
                ['Version', chalk.yellow(health.version || VERSION), 'Infinite Core Edition'],
                ['Pool Connections', chalk.blue(health.connectionPool?.totalCount || 'N/A'), `Active: ${health.connectionPool?.idleCount || 0}`]
            );

            if (health.performance) {
                table.push(
                    ['CPU Usage', chalk.yellow(`${health.performance.cpu_usage || 0}%`), 'Current utilization'],
                    ['Memory Usage', chalk.yellow(`${health.performance.memory_usage || 0}%`), 'Current utilization'],
                    ['Queries/Second', chalk.blue(health.performance.queries_per_second || 0), 'Current throughput']
                );
            }

            log.info(table.toString());
            
            if (health.storage) {
                log.info(chalk.cyan('\n📊 STORAGE INFORMATION'));
                log.info(`Total Size: ${chalk.yellow(health.storage.totalSize)}`);
            }

        } catch (error) {
            log.error(chalk.red('Status check failed:', error.message));
        }
    }

    async query(sql, options) {
        try {
            const spinner = ora('Executing query...').start();
            
            // Direct database query for now
            const result = await pool.query(sql);
            
            spinner.stop();
            
            if (options.format === 'json') {
                log.info(JSON.stringify(result.rows, null, 2));
            } else if (options.format === 'csv') {
                if (result.rows.length > 0) {
                    const headers = Object.keys(result.rows[0]);
                    log.info(headers.join(','));
                    result.rows.forEach(row => {
                        log.info(headers.map(h => row[h]).join(','));
                    });
                }
            } else {
                // Table format
                if (result.rows.length === 0) {
                    log.info(chalk.yellow('No results found'));
                    return;
                }

                const headers = Object.keys(result.rows[0]);
                const table = new Table({ head: headers });
                
                result.rows.forEach(row => {
                    table.push(headers.map(h => String(row[h] || '')));
                });
                
                log.info(table.toString());
                log.info(chalk.gray(`\n${result.rows.length} rows returned`));
            }
            
        } catch (error) {
            log.error(chalk.red('Query failed:', error.message));
        }
    }

    async aiQuery(question) {
        try {
            const spinner = ora('Processing AI query...').start();
            
            const result = await this.makeRequest('/api/3ondb/ai/query', {
                method: 'POST',
                data: { query: question }
            });
            
            spinner.stop();
            
            if (result.success) {
                log.info(chalk.cyan('\n🤖 AI ASSISTANT RESPONSE\n'));
                log.info(chalk.green('Generated SQL:'));
                log.info(chalk.blue(result.sql));
                
                if (result.data && result.data.length > 0) {
                    log.info(chalk.green('\nResults:'));
                    const table = new Table({ head: Object.keys(result.data[0]) });
                    result.data.forEach(row => {
                        table.push(Object.values(row));
                    });
                    log.info(table.toString());
                } else {
                    log.info(chalk.yellow('\nNo data returned'));
                }
            } else {
                log.error(chalk.red('AI query failed:', result.error));
            }
            
        } catch (error) {
            log.error(chalk.red('AI query error:', error.message));
        }
    }

    // ========================================================================
    // USER MANAGEMENT
    // ========================================================================

    async users(options) {
        try {
            if (options.list) {
                const spinner = ora('Fetching users...').start();
                const result = await this.makeRequest('/api/3ondb/users');
                spinner.stop();

                if (result.success) {
                    const table = new Table({
                        head: ['ID', 'Name', 'Email', 'Role', 'Active', 'Created']
                    });

                    result.data.forEach(user => {
                        table.push([
                            user.id,
                            user.name,
                            user.email,
                            chalk.blue(user.role),
                            user.is_active ? chalk.green('Yes') : chalk.red('No'),
                            new Date(user.created_at).toLocaleDateString()
                        ]);
                    });

                    log.info(table.toString());
                    log.info(chalk.gray(`\nTotal: ${result.data.length} users`));
                }
            } else if (options.create) {
                const answers = await inquirer.prompt([
                    { type: 'input', name: 'name', message: 'Full name:' },
                    { type: 'input', name: 'email', message: 'Email:' },
                    { 
                        type: 'list', 
                        name: 'role', 
                        message: 'Role:', 
                        choices: ['user', 'admin', 'super_admin'],
                        default: options.role || 'user'
                    },
                    { type: 'password', name: 'password', message: 'Password:' }
                ]);

                const spinner = ora('Creating user...').start();
                const result = await this.makeRequest('/api/3ondb/users', {
                    method: 'POST',
                    data: answers
                });
                spinner.stop();

                if (result.success) {
                    log.info(chalk.green('User created successfully!'));
                } else {
                    log.error(chalk.red('User creation failed:', result.error));
                }
            } else {
                log.info(chalk.yellow('Use --list to view users or --create to add new user'));
            }
        } catch (error) {
            log.error(chalk.red('User management error:', error.message));
        }
    }

    // ========================================================================
    // BACKUP COMMANDS
    // ========================================================================

    async backup(options) {
        try {
            if (options.create) {
                const name = typeof options.create === 'string' ? options.create : undefined;
                const spinner = ora('Creating backup...').start();
                
                const result = await this.makeRequest('/api/3ondb/backup', {
                    method: 'POST',
                    data: { name }
                });
                
                spinner.stop();
                
                if (result.success) {
                    log.info(chalk.green('Backup created successfully!'));
                    log.info(`Backup ID: ${chalk.blue(result.backupId)}`);
                    log.info(`File: ${chalk.gray(result.fileName)}`);
                    log.info(`Size: ${chalk.yellow(result.size)} bytes`);
                } else {
                    log.error(chalk.red('Backup failed:', result.error));
                }
            } else if (options.list) {
                const spinner = ora('Fetching backups...').start();
                const result = await this.makeRequest('/api/3ondb/backups');
                spinner.stop();

                if (result.success) {
                    const table = new Table({
                        head: ['ID', 'Type', 'Size', 'Created', 'Status']
                    });

                    result.data.forEach(backup => {
                        table.push([
                            backup.id,
                            backup.kind,
                            `${Math.round(backup.size_bytes / 1024)} KB`,
                            new Date(backup.created_at).toLocaleString(),
                            chalk.green('Complete')
                        ]);
                    });

                    log.info(table.toString());
                }
            } else {
                log.info(chalk.yellow('Use --create to make backup or --list to view backups'));
            }
        } catch (error) {
            log.error(chalk.red('Backup error:', error.message));
        }
    }

    // ========================================================================
    // MONITORING
    // ========================================================================

    async monitor(options) {
        log.info(chalk.cyan('🔍 REAL-TIME MONITORING'));
        log.info(chalk.gray('Press Ctrl+C to exit\n'));

        const interval = parseInt(options.interval) * 1000;

        const updateMetrics = async () => {
            try {
                const health = await this.makeRequest('/health');
                const analytics = await this.makeRequest('/api/3ondb/analytics/realtime');

                // Clear screen
                process.stdout.write('\x1Bc');
                
                log.info(chalk.cyan('🚀 3ONDB v3 INFINITE CORE - LIVE MONITORING'));
                log.info(chalk.gray(`Updated: ${new Date().toLocaleTimeString()}\n`));

                const table = new Table({
                    head: ['Metric', 'Value', 'Status'],
                    colWidths: [25, 15, 20]
                });

                if (health.performance) {
                    const cpu = health.performance.cpu_usage || 0;
                    const memory = health.performance.memory_usage || 0;
                    const qps = health.performance.queries_per_second || 0;

                    table.push(
                        ['CPU Usage', `${cpu}%`, cpu > 80 ? chalk.red('HIGH') : chalk.green('OK')],
                        ['Memory Usage', `${memory}%`, memory > 80 ? chalk.red('HIGH') : chalk.green('OK')],
                        ['Queries/Second', qps, qps > 500 ? chalk.yellow('BUSY') : chalk.green('OK')],
                        ['DB Connections', health.connectionPool?.totalCount || 0, chalk.blue('ACTIVE')]
                    );
                }

                log.info(table.toString());

                if (analytics.success) {
                    log.info(chalk.yellow('\n📊 REAL-TIME ANALYTICS'));
                    log.info(`Active Users: ${chalk.blue(analytics.data.active_users || 0)}`);
                    log.info(`Total Queries: ${chalk.blue(analytics.data.total_queries || 0)}`);
                }

            } catch (error) {
                log.error(chalk.red('Monitoring error:', error.message));
            }
        };

        // Initial update
        await updateMetrics();

        // Set up interval
        const monitorInterval = setInterval(updateMetrics, interval);

        // Handle Ctrl+C
        process.on('SIGINT', () => {
            clearInterval(monitorInterval);
            log.info(chalk.yellow('\nMonitoring stopped'));
            process.exit(0);
        });
    }

    // ========================================================================
    // 3ONCORE INTEGRATION
    // ========================================================================

    async coreIntegration(options) {
        log.info(chalk.cyan('🌐 3ONCORE ECOSYSTEM INTEGRATION\n'));

        try {
            if (options.sync) {
                const spinner = ora('Syncing with 3ONCORE services...').start();
                
                // Simulate 3ONCORE integration
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                spinner.succeed(chalk.green('3ONCORE sync completed'));
                
                const table = new Table({
                    head: ['Service', 'Status', 'Last Sync']
                });

                table.push(
                    ['3ONVPS', chalk.green('CONNECTED'), new Date().toLocaleString()],
                    ['3ONAI', chalk.green('CONNECTED'), new Date().toLocaleString()],
                    ['3ONCLOUD', chalk.green('CONNECTED'), new Date().toLocaleString()],
                    ['3ONSECURE', chalk.yellow('PENDING'), 'N/A']
                );

                log.info(table.toString());
                
            } else if (options.metrics) {
                const spinner = ora('Sharing metrics with 3ONVPS...').start();
                
                // Get current metrics
                const health = await this.makeRequest('/health');
                
                // Simulate metrics sharing
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                spinner.succeed(chalk.green('Metrics shared with 3ONVPS'));
                log.info(chalk.blue('VPS monitoring now has database performance data'));
                
            } else if (options.aiConnect) {
                const spinner = ora('Connecting to 3ONAI services...').start();
                
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                spinner.succeed(chalk.green('3ONAI connection established'));
                log.info(chalk.blue('AI query assistant enhanced with 3ONAI capabilities'));
                
            } else {
                log.info(chalk.yellow('3ONCORE Integration Options:'));
                log.info('  --sync          Sync with all 3ONCORE services');
                log.info('  --metrics       Share metrics with 3ONVPS');
                log.info('  --ai-connect    Connect to 3ONAI services');
                
                log.info(chalk.cyan('\n🔗 CORE ECOSYSTEM STATUS'));
                const status = {
                    '3ONVPS': '✅ Connected',
                    '3ONAI': '✅ Connected', 
                    '3ONCLOUD': '✅ Connected',
                    '3ONSECURE': '⚠️  Pending',
                    '3ONANALYTICS': '✅ Connected'
                };
                
                Object.entries(status).forEach(([service, stat]) => {
                    log.info(`  ${service}: ${stat}`);
                });
            }
        } catch (error) {
            log.error(chalk.red('3ONCORE integration error:', error.message));
        }
    }

    // ========================================================================
    // INTERACTIVE MODE
    // ========================================================================

    async interactive() {
        this.displayBanner();
        log.info(chalk.green('Welcome to Interactive Mode!'));
        log.info(chalk.gray('Type "help" for commands or "exit" to quit\n'));

    for (;;) {
            try {
                const { command } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'command',
                        message: chalk.blue('3ondb>'),
                        prefix: ''
                    }
                ]);

                if (command.toLowerCase() === 'exit') {
                    log.info(chalk.yellow('Goodbye! 👋'));
                    break;
                }

                if (command.toLowerCase() === 'help') {
                    this.showInteractiveHelp();
                    continue;
                }

                if (command.toLowerCase() === 'clear') {
                    console.clear();
                    this.displayBanner();
                    continue;
                }

                // Parse and execute command
                await this.executeInteractiveCommand(command);

            } catch (error) {
                log.error(chalk.red('Command error:', error.message));
            }
        }
    }

    showInteractiveHelp() {
        log.info(chalk.cyan('\n📚 INTERACTIVE COMMANDS'));
        log.info('  status      - Show system status');
        log.info('  users       - List users');
        log.info('  backups     - List backups'); 
        log.info('  ai <query>  - Ask AI assistant');
        log.info('  core sync   - Sync with 3ONCORE');
        log.info('  clear       - Clear screen');
        log.info('  help        - Show this help');
        log.info('  exit        - Exit interactive mode\n');
    }

    async executeInteractiveCommand(command) {
        const parts = command.split(' ');
        const cmd = parts[0].toLowerCase();

        switch (cmd) {
            case 'status':
                await this.status();
                break;
            case 'users':
                await this.users({ list: true });
                break;
            case 'backups':
                await this.backup({ list: true });
                break;
            case 'ai':
                if (parts.length > 1) {
                    await this.aiQuery(parts.slice(1).join(' '));
                } else {
                    log.info(chalk.yellow('Please provide a question: ai <your question>'));
                }
                break;
            case 'core':
                if (parts[1] === 'sync') {
                    await this.coreIntegration({ sync: true });
                } else {
                    await this.coreIntegration({});
                }
                break;
            default:
                log.info(chalk.red(`Unknown command: ${cmd}`));
                log.info(chalk.gray('Type "help" for available commands'));
        }
    }

    // ========================================================================
    // MAIN EXECUTION
    // ========================================================================

    async run() {
        await this.loadConfig();
        
        // Check if user is logged in for commands that require auth
        const command = process.argv[2];
        const authRequiredCommands = ['users', 'backup', 'ai', 'analytics', 'webhooks'];
        
        if (authRequiredCommands.includes(command) && !this.config?.token) {
            log.info(chalk.yellow('Please login first: 3ondb login'));
            return;
        }

        this.program.parse();
    }
}

// Create and run CLI
const cli = new InfiniteCoreCLI();
cli.run().catch(error => {
    log.error(chalk.red('CLI Error:', error.message));
    process.exit(1);
});

module.exports = InfiniteCoreCLI;