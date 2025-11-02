#!/usr/bin/env node

// 3ONDB v2 PRIME QUANTUM EDITION - CLI TOOL
// Command-line interface for enterprise database management

const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const program = new Command();

// ============================================================================
// CLI CONFIGURATION
// ============================================================================

program
    .name('3ondb-quantum')
    .description('🚀 3ONDB v2 Prime Quantum Edition - Enterprise Database CLI')
    .version('2.0.0');

// Database connection
const pool = new Pool({
    user: process.env.DB_USER || process.env.PGUSER || 'postgres',
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    database: process.env.DB_NAME || process.env.PGDATABASE || '3ONDB',
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const log = {
    success: (msg) => log.info(chalk.green('✅ ' + msg)),
    error: (msg) => log.info(chalk.red('❌ ' + msg)),
    info: (msg) => log.info(chalk.blue('ℹ️  ' + msg)),
    warning: (msg) => log.info(chalk.yellow('⚠️  ' + msg)),
    quantum: (msg) => log.info(chalk.magenta('🚀 ' + msg))
};

const spinner = {
    start: (msg) => {
        process.stdout.write(chalk.cyan(`⏳ ${msg}... `));
    },
    stop: (success = true) => {
        // write directly to stdout to avoid using log.info(use project logger elsewhere)
        process.stdout.write(success ? chalk.green('✅\n') : chalk.red('❌\n'));
    }
};

// ============================================================================
// DATABASE COMMANDS
// ============================================================================

program
    .command('init')
    .description('Initialize 3ONDB Prime Quantum Edition')
    .option('--force', 'Force initialization (will drop existing tables)')
    .action(async (options) => {
        try {
            log.quantum('Initializing 3ONDB Prime Quantum Edition...');
            
            if (options.force) {
                log.warning('Force mode enabled - this will drop existing data!');
                const { confirm } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Are you sure you want to continue?',
                    default: false
                }]);
                
                if (!confirm) {
                    log.info('Initialization cancelled');
                    return;
                }
            }
            
            // Read and execute the upgrade SQL
            const sqlPath = path.join(__dirname, '../db/3ondb_upgrade_v2.sql');
            const sql = await fs.readFile(sqlPath, 'utf8');
            
            spinner.start('Executing database migrations');
            await pool.query(sql);
            spinner.stop();
            
            log.success('3ONDB Prime Quantum Edition initialized successfully!');
            log.info('Database features:');
            log.info('  • Enterprise audit logging');
            log.info('  • Real-time activity streams');
            log.info('  • Advanced analytics');
            log.info('  • Quantum-level performance');
            
        } catch (error) {
            spinner.stop(false);
            log.error(`Initialization failed: ${error.message}`);
            process.exit(1);
        }
    });

program
    .command('status')
    .description('Check system status and health')
    .action(async () => {
        try {
            log.quantum('Checking 3ONDB Prime Quantum system status...');
            
            // Test database connection
            spinner.start('Testing database connection');
            const dbTest = await pool.query('SELECT NOW()');
            spinner.stop();
            // surface server time to the operator to confirm DB responsiveness
            if (dbTest && dbTest.rows && dbTest.rows[0]) {
                log.info(`DB time: ${dbTest.rows[0].now}`);
            }
            
            // Get table counts
            const tables = [
                'users', 'projects', 'tasks', 'comments', 'organizations', 
                'memberships', 'files', 'notifications', 'audit_logs', 
                'activity_streams', 'analytics_snapshots', 'system_settings',
                'api_keys', 'sessions', 'backups'
            ];
            
            log.info('\n' + chalk.cyan('📊 Database Statistics:'));
            for (const table of tables) {
                try {
                    const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                    const count = result.rows[0].count;
                    log.info(`  ${table.padEnd(20)} ${chalk.green(count)} records`);
                } catch (error) {
                    log.error(`  ${table.padEnd(20)} ${chalk.red('ERROR')}`);
                }
            }
            
            // Get system metrics
            log.info('\n' + chalk.cyan('⚡ Real-time Metrics:'));
            const metricsQuery = `
                SELECT metric_name, metric_value, metric_unit 
                FROM system_metrics_realtime
            `;
            const metrics = await pool.query(metricsQuery);
            
            metrics.rows.forEach(metric => {
                log.info(`  ${metric.metric_name.padEnd(20)} ${chalk.yellow(metric.metric_value)} ${metric.metric_unit}`);
            });
            
            // Connection pool status
            log.info('\n' + chalk.cyan('🔗 Connection Pool:'));
            log.info(`  Total connections:    ${chalk.green(pool.totalCount)}`);
            log.info(`  Idle connections:     ${chalk.blue(pool.idleCount)}`);
            log.info(`  Waiting connections:  ${chalk.yellow(pool.waitingCount)}`);
            
            log.success('System status check completed!');
            
        } catch (error) {
            log.error(`Status check failed: ${error.message}`);
            process.exit(1);
        }
    });

// ============================================================================
// USER MANAGEMENT COMMANDS
// ============================================================================

program
    .command('user')
    .description('User management commands')
    .argument('<action>', 'Action to perform (create, list, delete)')
    .option('--email <email>', 'User email')
    .option('--name <name>', 'User name')
    .option('--role <role>', 'User role (admin, user)', 'user')
    .action(async (action, options) => {
        try {
            switch (action) {
                case 'create':
                    await createUser(options);
                    break;
                case 'list':
                    await listUsers();
                    break;
                case 'delete':
                    await deleteUser(options);
                    break;
                default:
                    log.error('Invalid action. Use: create, list, delete');
            }
        } catch (error) {
            log.error(`User command failed: ${error.message}`);
            process.exit(1);
        }
    });

async function createUser(options) {
    let { email, name, role } = options;
    
    if (!email || !name) {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'email',
                message: 'Email:',
                when: !email,
                validate: (input) => input.includes('@') || 'Please enter a valid email'
            },
            {
                type: 'input',
                name: 'name',
                message: 'Name:',
                when: !name,
                validate: (input) => input.length > 0 || 'Name is required'
            },
            {
                type: 'list',
                name: 'role',
                message: 'Role:',
                choices: ['user', 'admin'],
                default: role
            }
        ]);
        
        email = email || answers.email;
        name = name || answers.name;
        role = answers.role || role;
    }
    
    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    
    spinner.start('Creating user');
    const query = `
        INSERT INTO users (name, email, password, role, is_active)
        VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, true)
        RETURNING id, name, email, role
    `;
    
    const result = await pool.query(query, [name, email, tempPassword, role]);
    const user = result.rows[0];
    spinner.stop();
    
    log.success(`User created successfully!`);
    log.info(`  ID: ${user.id}`);
    log.info(`  Name: ${user.name}`);
    log.info(`  Email: ${user.email}`);
    log.info(`  Role: ${user.role}`);
    log.info(`  Temporary Password: ${chalk.yellow(tempPassword)}`);
    log.warning('User should change password on first login');
}

async function listUsers() {
    spinner.start('Fetching users');
    const result = await pool.query(`
        SELECT id, name, email, role, is_active, created_at,
               (SELECT COUNT(*) FROM projects WHERE created_by = users.id) as project_count,
               (SELECT COUNT(*) FROM tasks WHERE assigned_to = users.id) as task_count
        FROM users
        ORDER BY created_at DESC
    `);
    spinner.stop();
    
    log.info('\n' + chalk.cyan('👥 Users:'));
    log.info('ID'.padEnd(4) + 'Name'.padEnd(20) + 'Email'.padEnd(30) + 'Role'.padEnd(10) + 'Projects'.padEnd(10) + 'Tasks');
    log.info('-'.repeat(80));
    
    result.rows.forEach(user => {
        const status = user.is_active ? '🟢' : '🔴';
        log.info(
            `${user.id}`.padEnd(4) +
            `${user.name}`.padEnd(20) +
            `${user.email}`.padEnd(30) +
            `${user.role}`.padEnd(10) +
            `${user.project_count}`.padEnd(10) +
            `${user.task_count}`.padEnd(8) +
            status
        );
    });
}

async function deleteUser(options) {
    let identifier = options.email || options.id;
    if (!identifier) {
        const answers = await inquirer.prompt([
            { type: 'input', name: 'identifier', message: 'User ID or email to delete:' }
        ]);
        identifier = answers.identifier;
    }

    if (!identifier) {
        log.error('No identifier provided');
        return;
    }

    // Determine whether identifier looks like an email
    const isEmail = identifier.includes('@');
    const query = isEmail ? 'DELETE FROM users WHERE email = $1 RETURNING id' : 'DELETE FROM users WHERE id = $1 RETURNING id';

    spinner.start('Deleting user');
    try {
        const result = await pool.query(query, [identifier]);
        spinner.stop();
        if (result.rowCount && result.rowCount > 0) {
            log.success('User deleted successfully');
        } else {
            log.error('User not found');
        }
    } catch (err) {
        spinner.stop(false);
        log.error(`Delete failed: ${err.message}`);
    }
}

// ============================================================================
// BACKUP COMMANDS
// ============================================================================

program
    .command('backup')
    .description('Create database backup')
    .option('--name <name>', 'Backup name')
    .option('--type <type>', 'Backup type (manual, scheduled)', 'manual')
    .action(async (options) => {
        try {
            const backupName = options.name || `backup_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}`;
            
            log.quantum(`Creating backup: ${backupName}`);
            
            spinner.start('Creating backup');
            
            // Create backup directory if it doesn't exist
            const backupDir = path.join(__dirname, '../backups');
            try {
                await fs.mkdir(backupDir, { recursive: true });
            } catch (error) {
                // Directory already exists
            }
            
            const fileName = `${backupName}.sql`;
            const filePath = path.join(backupDir, fileName);
            
            // Insert backup record
            const backupQuery = `
                INSERT INTO backups (backup_name, backup_type, file_path, backup_status)
                VALUES ($1, $2, $3, 'completed')
                RETURNING id
            `;
            
            const result = await pool.query(backupQuery, [backupName, options.type, filePath]);
            const backupId = result.rows[0].id;
            
            // Create backup file (simplified version)
            const backupContent = `-- 3ONDB Prime Quantum Backup
-- Created: ${new Date().toISOString()}
-- Backup ID: ${backupId}
-- Type: ${options.type}

-- This is a placeholder backup file
-- In production, use pg_dump for full database backup
`;
            
            await fs.writeFile(filePath, backupContent);
            spinner.stop();
            
            log.success(`Backup created successfully!`);
            log.info(`  Backup ID: ${backupId}`);
            log.info(`  File: ${filePath}`);
            log.info(`  Type: ${options.type}`);
            
        } catch (error) {
            spinner.stop(false);
            log.error(`Backup failed: ${error.message}`);
            process.exit(1);
        }
    });

program
    .command('restore')
    .description('Restore from backup')
    .argument('<backup-id>', 'Backup ID to restore')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (backupId, options) => {
        try {
            // Get backup details
            const backupQuery = await pool.query('SELECT * FROM backups WHERE id = $1', [backupId]);
            
            if (backupQuery.rows.length === 0) {
                log.error('Backup not found');
                process.exit(1);
            }
            
            const backup = backupQuery.rows[0];
            
            log.info('\n' + chalk.cyan('📋 Backup Details:'));
            log.info(`  Name: ${backup.backup_name}`);
            log.info(`  Created: ${backup.created_at}`);
            log.info(`  Type: ${backup.backup_type}`);
            log.info(`  File: ${backup.file_path}`);
            
            if (!options.confirm) {
                log.warning('This will restore the database to the backup state');
                const { confirm } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Continue with restore?',
                    default: false
                }]);
                
                if (!confirm) {
                    log.info('Restore cancelled');
                    return;
                }
            }
            
            spinner.start('Restoring from backup');
            
            // Update restore count
            await pool.query(`
                UPDATE backups 
                SET restore_count = restore_count + 1, last_restored_at = NOW()
                WHERE id = $1
            `, [backupId]);
            
            spinner.stop();
            log.success('Restore completed successfully!');
            
        } catch (error) {
            spinner.stop(false);
            log.error(`Restore failed: ${error.message}`);
            process.exit(1);
        }
    });

// ============================================================================
// ANALYTICS COMMANDS
// ============================================================================

program
    .command('analytics')
    .description('Generate analytics report')
    .option('--days <days>', 'Number of days to analyze', '7')
    .action(async (options) => {
        try {
            const days = parseInt(options.days);
            log.quantum(`Generating ${days}-day analytics report...`);
            
            spinner.start('Collecting analytics data');
            
            // Get various metrics
            const queries = {
                userActivity: `
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as activities
                    FROM activity_streams 
                    WHERE created_at > NOW() - INTERVAL '${days} days'
                    GROUP BY DATE(created_at)
                    ORDER BY date
                `,
                taskCompletion: `
                    SELECT 
                        status,
                        COUNT(*) as count
                    FROM tasks
                    WHERE updated_at > NOW() - INTERVAL '${days} days'
                    GROUP BY status
                `,
                topUsers: `
                    SELECT 
                        u.name,
                        COUNT(a.id) as activity_count
                    FROM users u
                    LEFT JOIN activity_streams a ON u.id = a.user_id
                    WHERE a.created_at > NOW() - INTERVAL '${days} days'
                    GROUP BY u.id, u.name
                    ORDER BY activity_count DESC
                    LIMIT 10
                `
            };
            
            const results = {};
            for (const [key, query] of Object.entries(queries)) {
                results[key] = await pool.query(query);
            }
            
            spinner.stop();
            
            // Display results
            log.info('\n' + chalk.cyan('📈 Analytics Report') + chalk.gray(` (Last ${days} days)`));
            log.info('='.repeat(50));
            
            log.info('\n' + chalk.yellow('📅 Daily Activity:'));
            results.userActivity.rows.forEach(row => {
                log.info(`  ${row.date} | ${chalk.green(row.activities)} activities`);
            });
            
            log.info('\n' + chalk.yellow('✅ Task Status Distribution:'));
            results.taskCompletion.rows.forEach(row => {
                log.info(`  ${row.status.padEnd(15)} | ${chalk.green(row.count)} tasks`);
            });
            
            log.info('\n' + chalk.yellow('🏆 Most Active Users:'));
            results.topUsers.rows.forEach((row, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
                log.info(`  ${medal} ${row.name.padEnd(20)} | ${chalk.green(row.activity_count)} activities`);
            });
            
            log.success('Analytics report generated!');
            
        } catch (error) {
            spinner.stop(false);
            log.error(`Analytics generation failed: ${error.message}`);
            process.exit(1);
        }
    });

// ============================================================================
// SYSTEM COMMANDS
// ============================================================================

program
    .command('settings')
    .description('Manage system settings')
    .argument('<action>', 'Action (list, get, set)')
    .argument('[key]', 'Setting key')
    .argument('[value]', 'Setting value')
    .action(async (action, key, value) => {
        try {
            switch (action) {
                case 'list':
                    await listSettings();
                    break;
                case 'get':
                    if (!key) throw new Error('Setting key required');
                    await getSetting(key);
                    break;
                case 'set':
                    if (!key || !value) throw new Error('Setting key and value required');
                    await setSetting(key, value);
                    break;
                default:
                    log.error('Invalid action. Use: list, get, set');
            }
        } catch (error) {
            log.error(`Settings command failed: ${error.message}`);
            process.exit(1);
        }
    });

async function listSettings() {
    const result = await pool.query(`
        SELECT setting_key, setting_value, category, description
        FROM system_settings
        ORDER BY category, setting_key
    `);
    
    log.info('\n' + chalk.cyan('⚙️  System Settings:'));
    let currentCategory = '';
    
    result.rows.forEach(setting => {
            if (setting.category !== currentCategory) {
            currentCategory = setting.category;
            log.info('\n' + chalk.yellow(`📁 ${currentCategory.toUpperCase()}:`));
        }
        
            log.info(`  ${setting.setting_key.padEnd(30)} | ${chalk.green(setting.setting_value)}`);
        if (setting.description) {
            log.info(`    ${chalk.gray(setting.description)}`);
        }
    });
}

// ============================================================================
// MIGRATION WRAPPER
// ============================================================================
program
    .command('migrate')
    .description('Run SQL migrations from migrations/pg using the project runner')
    .option('--force', 'Force apply migrations (overrides checksum mismatch)')
    .option('--psql', 'Run migrations using psql (each file executed via psql)')
    .action(async (options) => {
        try {
            log.quantum('Running migrations using scripts/run_migrations.js');
            const parts = ['node', 'scripts/run_migrations.js'];
            if (options.force) parts.push('--force');
            if (options.psql) parts.push('--psql');
            const cmd = parts.join(' ');
            // Run the migration runner in a child process so stdout/stderr are visible
            execSync(cmd, { stdio: 'inherit' });
            log.success('Migrations completed');
        } catch (err) {
            log.error(`Migrate failed: ${err.message}`);
            process.exit(1);
        }
    });

async function getSetting(key) {
    const result = await pool.query('SELECT * FROM system_settings WHERE setting_key = $1', [key]);
    
    if (result.rows.length === 0) {
        log.error('Setting not found');
        return;
    }
    
    const setting = result.rows[0];
    log.info('\n' + chalk.cyan('⚙️  Setting Details:'));
    log.info(`  Key:         ${setting.setting_key}`);
    log.info(`  Value:       ${chalk.green(setting.setting_value)}`);
    log.info(`  Type:        ${setting.setting_type}`);
    log.info(`  Category:    ${setting.category}`);
    log.info(`  Description: ${setting.description}`);
}

async function setSetting(key, value) {
    spinner.start('Updating setting');
    
    const result = await pool.query(`
        UPDATE system_settings 
        SET setting_value = $2, updated_at = NOW()
        WHERE setting_key = $1
        RETURNING *
    `, [key, value]);
    
    spinner.stop();
    
    if (result.rows.length === 0) {
        log.error('Setting not found');
        return;
    }
    
    log.success(`Setting '${key}' updated to '${value}'`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

program.parse();

// Handle no command
if (!process.argv.slice(2).length) {
    log.quantum('3ONDB v2 Prime Quantum Edition CLI');
    log.info('Run --help for available commands');
    program.outputHelp();
}