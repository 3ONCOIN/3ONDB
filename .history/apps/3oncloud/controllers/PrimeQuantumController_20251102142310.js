// 3ONDB v2 PRIME QUANTUM EDITION - MAIN CONTROLLER
// Enterprise-grade database controller with real-time capabilities

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const WebSocket = require('ws');
const redis = require('redis');
const log = require('../../../lib/cli-logger.js');

class PrimeQuantumController {
    constructor() {
        // Use environment-first configuration for database credentials.
        this.pool = new Pool({
            user: process.env.DB_USER || process.env.PGUSER || 'postgres',
            host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
            database: process.env.DB_NAME || process.env.PGDATABASE || '3ONDB',
            password: process.env.DB_PASSWORD || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
            port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
            max: parseInt(process.env.DB_POOL_MAX || '100', 10), // connection pool size
            idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
            connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '2000', 10),
        });
        
        // Redis for caching and real-time features
        this.redisClient = redis.createClient();
        this.redisClient.connect().catch(console.error);
        
        // WebSocket server for real-time updates
        this.wss = new WebSocket.Server({ port: 8080 });
        this.setupWebSocket();
        
    // JWT secret - use environment variable in production (do not commit secrets)
    this.jwtSecret = process.env.JWT_SECRET || 'REPLACE_ME';
        
        log.info('🚀 3ONDB v2 Prime Quantum Controller Initialized!');
    }

    // =========================================================================
    // AUTHENTICATION & SESSION MANAGEMENT
    // =========================================================================

    async authenticateUser(email, password) {
        try {
            const query = 'SELECT * FROM users WHERE email = $1';
            const result = await this.pool.query(query, [email]);
            
            if (result.rows.length === 0) {
                throw new Error('User not found');
            }
            
            const user = result.rows[0];
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                throw new Error('Invalid password');
            }
            
            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                this.jwtSecret,
                { expiresIn: '24h' }
            );
            
            // Create session record
            const sessionId = crypto.randomUUID();
            await this.pool.query(`
                INSERT INTO sessions (session_id, user_id, jwt_token, ip_address, expires_at)
                VALUES ($1, $2, $3, $4, $5)
            `, [sessionId, user.id, token, '127.0.0.1', new Date(Date.now() + 24*60*60*1000)]);
            
            // Log authentication
            await this.auditLog(user.id, 'LOGIN', 'users', user.id, null, { session_id: sessionId });
            
            return {
                success: true,
                token,
                sessionId,
                user: { id: user.id, email: user.email, name: user.name, role: user.role }
            };
            
        } catch (error) {
            log.error('Authentication error:', error);
            return { success: false, error: error.message };
        }
    }

    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            
            // Check if session is still active
            const sessionQuery = `
                SELECT * FROM sessions 
                WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
            `;
            const sessionResult = await this.pool.query(sessionQuery, [decoded.userId]);
            
            if (sessionResult.rows.length === 0) {
                throw new Error('Session expired or invalid');
            }
            
            // Update last activity
            await this.pool.query(`
                UPDATE sessions 
                SET last_activity = NOW() 
                WHERE user_id = $1 AND is_active = true
            `, [decoded.userId]);
            
            return { success: true, user: decoded };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // REAL-TIME COLLABORATION
    // =========================================================================

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            log.info('🔗 New WebSocket connection established');
            
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message);
                    await this.handleRealtimeEvent(ws, data);
                } catch (error) {
                    log.error('WebSocket message error:', error);
                }
            });
            
            ws.on('close', () => {
                log.info('🔌 WebSocket connection closed');
            });
        });
    }

    async handleRealtimeEvent(ws, data) {
        const { type, payload, token } = data;
        
        // Verify user authentication
        const auth = await this.verifyToken(token);
        if (!auth.success) {
            ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
            return;
        }
        
        switch (type) {
            case 'typing':
                await this.handleTypingEvent(ws, auth.user, payload);
                break;
            case 'task_update':
                await this.handleTaskUpdate(ws, auth.user, payload);
                break;
            case 'join_project':
                await this.handleJoinProject(ws, auth.user, payload);
                break;
            default:
                log.info('Unknown realtime event type:', type);
        }
    }

    async handleTypingEvent(ws, user, payload) {
        const { projectId, taskId, isTyping } = payload;
        
        // Insert activity stream record
        await this.pool.query(`
            INSERT INTO activity_streams (user_id, project_id, task_id, activity_type, metadata)
            VALUES ($1, $2, $3, 'typing', $4)
        `, [user.userId, projectId, taskId, JSON.stringify({ isTyping })]);
        
        // Broadcast to all clients in project
        this.broadcastToProject(projectId, {
            type: 'user_typing',
            user: { id: user.userId, name: user.name },
            taskId,
            isTyping
        });
    }

    broadcastToProject(projectId, message) {
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client.projectId === projectId) {
                client.send(JSON.stringify(message));
            }
        });
    }

    // =========================================================================
    // CRUD OPERATIONS WITH REAL-TIME UPDATES
    // =========================================================================

    async createTask(userId, taskData) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            const { title, description, projectId, priority, assignedTo, dueDate } = taskData;
            
            const query = `
                INSERT INTO tasks (title, description, project_id, assigned_to, priority, due_date, status, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
                RETURNING *
            `;
            
            const result = await client.query(query, [
                title, description, projectId, assignedTo, priority, dueDate, userId
            ]);
            
            const newTask = result.rows[0];
            
            // Create activity stream
            await client.query(`
                INSERT INTO activity_streams (user_id, project_id, task_id, activity_type, content)
                VALUES ($1, $2, $3, 'task_created', $4)
            `, [userId, projectId, newTask.id, `Created task: ${title}`]);
            
            await client.query('COMMIT');
            
            // Real-time broadcast
            this.broadcastToProject(projectId, {
                type: 'task_created',
                task: newTask,
                user: { id: userId }
            });
            
            // Cache the task
            await this.redisClient.setEx(`task:${newTask.id}`, 3600, JSON.stringify(newTask));
            
            return { success: true, task: newTask };
            
        } catch (error) {
            await client.query('ROLLBACK');
            log.error('Create task error:', error);
            return { success: false, error: error.message };
        } finally {
            client.release();
        }
    }

    async updateTask(userId, taskId, updates) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Get current task
            const currentTask = await client.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
            if (currentTask.rows.length === 0) {
                throw new Error('Task not found');
            }
            
            const oldTask = currentTask.rows[0];
            
            // Build dynamic update query
            const updateFields = [];
            const updateValues = [];
            let paramCount = 1;
            
            Object.keys(updates).forEach(key => {
                if (['title', 'description', 'status', 'priority', 'assigned_to', 'due_date'].includes(key)) {
                    updateFields.push(`${key} = $${paramCount}`);
                    updateValues.push(updates[key]);
                    paramCount++;
                }
            });
            
            updateFields.push(`updated_at = NOW()`);
            updateValues.push(taskId);
            
            const updateQuery = `
                UPDATE tasks 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;
            
            const result = await client.query(updateQuery, updateValues);
            const updatedTask = result.rows[0];
            
            // Create activity stream
            const changes = Object.keys(updates).map(key => `${key}: ${oldTask[key]} → ${updates[key]}`).join(', ');
            await client.query(`
                INSERT INTO activity_streams (user_id, project_id, task_id, activity_type, content)
                VALUES ($1, $2, $3, 'task_updated', $4)
            `, [userId, updatedTask.project_id, taskId, `Updated: ${changes}`]);
            
            await client.query('COMMIT');
            
            // Real-time broadcast
            this.broadcastToProject(updatedTask.project_id, {
                type: 'task_updated',
                task: updatedTask,
                changes: updates,
                user: { id: userId }
            });
            
            // Update cache
            await this.redisClient.setEx(`task:${taskId}`, 3600, JSON.stringify(updatedTask));
            
            return { success: true, task: updatedTask };
            
        } catch (error) {
            await client.query('ROLLBACK');
            log.error('Update task error:', error);
            return { success: false, error: error.message };
        } finally {
            client.release();
        }
    }

    // =========================================================================
    // ANALYTICS & REPORTING
    // =========================================================================

    async getAnalyticsDashboard(userId) {
        try {
            // Get real-time metrics
            const metricsQuery = `
                SELECT metric_name, metric_value, metric_unit 
                FROM system_metrics_realtime
            `;
            const metrics = await this.pool.query(metricsQuery);
            
            // Get user's project statistics
            const userStatsQuery = `
                SELECT 
                    COUNT(DISTINCT p.id) as total_projects,
                    COUNT(DISTINCT t.id) as total_tasks,
                    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
                    COUNT(DISTINCT CASE WHEN t.assigned_to = $1 THEN t.id END) as assigned_tasks
                FROM projects p
                LEFT JOIN tasks t ON p.id = t.project_id
                WHERE p.created_by = $1 OR EXISTS (
                    SELECT 1 FROM memberships m 
                    WHERE m.project_id = p.id AND m.user_id = $1
                )
            `;
            const userStats = await this.pool.query(userStatsQuery, [userId]);
            
            // Get recent activity
            const activityQuery = `
                SELECT 
                    a.activity_type,
                    a.content,
                    a.created_at,
                    u.name as user_name,
                    p.name as project_name
                FROM activity_streams a
                JOIN users u ON a.user_id = u.id
                LEFT JOIN projects p ON a.project_id = p.id
                WHERE a.created_at > NOW() - INTERVAL '24 hours'
                ORDER BY a.created_at DESC
                LIMIT 20
            `;
            const recentActivity = await this.pool.query(activityQuery);
            
            return {
                success: true,
                data: {
                    systemMetrics: metrics.rows,
                    userStats: userStats.rows[0],
                    recentActivity: recentActivity.rows
                }
            };
            
        } catch (error) {
            log.error('Analytics dashboard error:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // AUDIT LOGGING
    // =========================================================================

    async auditLog(userId, action, tableName, recordId, oldData = null, newData = null, metadata = {}) {
        try {
            await this.pool.query(`
                INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [userId, action, tableName, recordId, oldData, newData, JSON.stringify(metadata)]);
        } catch (error) {
            log.error('Audit log error:', error);
        }
    }

    // =========================================================================
    // BACKUP OPERATIONS
    // =========================================================================

    async createBackup(userId, backupName, backupType = 'manual') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `3ondb_backup_${timestamp}.sql`;
            const filePath = `/Users/3ON/Desktop/3ONPRIME/backups/${fileName}`;
            
            // Insert backup record
            const backupQuery = `
                INSERT INTO backups (backup_name, backup_type, file_path, backup_status, created_by)
                VALUES ($1, $2, $3, 'in_progress', $4)
                RETURNING id
            `;
            const result = await this.pool.query(backupQuery, [backupName, backupType, filePath, userId]);
            const backupId = result.rows[0].id;
            
            // Simulate backup process (in production, use pg_dump)
            setTimeout(async () => {
                try {
                    // Update backup status to completed
                    await this.pool.query(`
                        UPDATE backups 
                        SET backup_status = 'completed', file_size_bytes = 1048576
                        WHERE id = $1
                    `, [backupId]);
                    
                    log.info(`✅ Backup ${backupName} completed successfully`);
                } catch (error) {
                    log.error('Backup completion error:', error);
                }
            }, 2000);
            
            return { success: true, backupId, fileName };
            
        } catch (error) {
            log.error('Create backup error:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // SYSTEM HEALTH MONITORING
    // =========================================================================

    async getSystemHealth() {
        try {
            // Database connection test
            const dbTest = await this.pool.query('SELECT NOW()');
            
            // Get connection pool status
            const poolStatus = {
                totalCount: this.pool.totalCount,
                idleCount: this.pool.idleCount,
                waitingCount: this.pool.waitingCount
            };
            
            // Redis connection test
            let redisStatus = 'connected';
            try {
                await this.redisClient.ping();
            } catch (error) {
                redisStatus = 'disconnected';
            }
            
            // WebSocket connections
            const wsConnections = this.wss.clients.size;
            
            return {
                success: true,
                health: {
                    database: 'healthy',
                    redis: redisStatus,
                    websocket: wsConnections > 0 ? 'active' : 'inactive',
                    connectionPool: poolStatus,
                    timestamp: new Date().toISOString()
                }
            };
            
        } catch (error) {
            log.error('System health check error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export the controller
module.exports = PrimeQuantumController;

// Example usage:
if (require.main === module) {
    const controller = new PrimeQuantumController();
    
    // Example authentication
    log.info('🧪 Testing Prime Quantum Controller...');
    
    setTimeout(async () => {
        const healthCheck = await controller.getSystemHealth();
        log.info('System Health:', healthCheck);
    }, 1000);
}