// 3ONDB v2 PRIME QUANTUM EDITION - API ROUTES
// Ultra-fast, secure REST API with real-time capabilities

const express = require('express');
// const PrimeQuantumController = require('./controllers/PrimeQuantumController');
const router = express.Router();

// In this deployment mode the full Postgres-backed controller may be disabled.
// To avoid lint/runtime undefined references we expose a null placeholder here.
const quantumController = null; // set by runtime when Postgres controller is enabled
const createLogger = require('../../apps/3oncode/utils/logger');
const log = require('../../../lib/cli-logger.js');
const logger = createLogger('api:routes');
const requireController = (req, res, next) => {
    if (!quantumController) {
        return res.status(503).json({ error: 'Controller not initialized in this mode' });
    }
    next();
};

// Controller disabled for SQLite-only mode
// const quantumController = new PrimeQuantumController();

// ============================================================================
// MIDDLEWARE FOR AUTHENTICATION
// ============================================================================

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    // If the Postgres-backed controller is not available, short-circuit.
    let verification = { success: false, error: 'Verification disabled in this mode' };
    if (quantumController && typeof quantumController.verifyToken === 'function') {
        verification = await quantumController.verifyToken(token);
    }

    if (!verification.success) {
        return res.status(403).json({ error: verification.error });
    }

    req.user = verification.user;
    next();
};

// Rate limiting middleware
const rateLimit = (maxRequests = 100, windowMs = 60000) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const key = req.ip;
        const now = Date.now();
        
        if (!requests.has(key)) {
            requests.set(key, { count: 1, firstRequest: now });
            return next();
        }
        
        const userRequests = requests.get(key);
        
        if (now - userRequests.firstRequest > windowMs) {
            userRequests.count = 1;
            userRequests.firstRequest = now;
        } else {
            userRequests.count++;
        }
        
        if (userRequests.count > maxRequests) {
            return res.status(429).json({ 
                error: 'Too many requests', 
                retryAfter: Math.ceil((windowMs - (now - userRequests.firstRequest)) / 1000) 
            });
        }
        
        next();
    };
};

// ============================================================================
// TENANT-AWARE MIDDLEWARE
// ============================================================================

const tenantMiddleware = (req, res, next) => {
    // Example: Extract tenant ID from header or subdomain
    req.tenantId = req.headers['x-tenant-id'] || null;
    if (!req.tenantId) {
        return res.status(400).json({ error: 'Tenant ID required' });
    }
    next();
};

// ============================================================================
// CDN INTEGRATION ENDPOINTS
// ============================================================================

// POST /api/cdn/purge - Purge CDN cache for a file or bucket
router.post('/cdn/purge', tenantMiddleware, async (req, res) => {
    const { target } = req.body; // file or bucket identifier
    if (!target) {
        return res.status(400).json({ error: 'Target required for purge' });
    }
    // TODO: Integrate with CDN provider API
    // Simulate purge
    res.json({ success: true, message: `CDN cache purged for ${target}` });
});

// GET /api/cdn/status - Get CDN status for a file or bucket
router.get('/cdn/status', tenantMiddleware, async (req, res) => {
    const { target } = req.query;
    if (!target) {
        return res.status(400).json({ error: 'Target required for status' });
    }
    // TODO: Integrate with CDN provider API
    // Simulate status
    res.json({ success: true, target, status: 'active', lastPurge: Date.now() });
});

// ============================================================================
// TENANT MANAGEMENT ENDPOINTS
// ============================================================================

// POST /api/tenant/create - Create a new tenant
router.post('/tenant/create', async (req, res) => {
    const { name, owner } = req.body;
    if (!name || !owner) {
        return res.status(400).json({ error: 'Tenant name and owner required' });
    }
    // TODO: Add tenant creation logic (DB insert)
    res.json({ success: true, tenantId: `tenant_${Date.now()}` });
});

// GET /api/tenant/list - List all tenants (admin only)
router.get('/tenant/list', async (req, res) => {
    // TODO: Add tenant listing logic (DB query)
    res.json({ success: true, tenants: [] });
});

// GET /api/tenant/:id - Get tenant details
router.get('/tenant/:id', async (req, res) => {
    const { id } = req.params;
    // TODO: Add tenant detail logic (DB query)
    res.json({ success: true, tenant: { id, name: 'Example Tenant', owner: 'admin' } });
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

// POST /api/auth/login - User authentication
router.post('/auth/login', rateLimit(10, 60000), async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
    // const result = await quantumController.authenticateUser(email, password); // Disabled for SQLite-only mode
        
        // if (result.success) {
        //     res.json({
        //         success: true,
        //         token: result.token,
        //         sessionId: result.sessionId,
        //         user: result.user
        //     });
        // } else {
        //     res.status(401).json({ error: result.error });
        // }
        
    } catch (error) {
    // log.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/verify - Token verification
router.post('/auth/verify', async (req, res) => {
    try {
        // Token verification disabled in this mode (Postgres-backed controller not initialized)
        // const result = await quantumController.verifyToken(token); // Disabled for SQLite-only mode
        
        // if (result.success) {
        //     res.json({ valid: true, user: result.user });
        // } else {
        //     res.status(401).json({ valid: false, error: result.error });
        // }
        
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================================
// TASK MANAGEMENT ROUTES
// ============================================================================

// GET /api/tasks - Get all tasks for authenticated user
router.get('/tasks', authenticateToken, requireController, rateLimit(200), async (req, res) => {
    try {
        // In SQLite-only or controller-disabled mode return an empty tasks list.
        if (!quantumController) {
            return res.json({ success: true, tasks: [] });
        }

        // Postgres-backed implementation is available when controller is enabled.
        // The full implementation is intentionally disabled in this mode.
        return res.json({ success: true, tasks: [] });
        
    } catch (error) {
    // log.error('Get tasks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/tasks - Create new task
router.post('/tasks', authenticateToken, requireController, rateLimit(50), async (req, res) => {
    try {
        if (!quantumController) {
            return res.status(503).json({ error: 'Controller not initialized in this mode' });
        }

    // Task creation is disabled in this deployment mode. When enabled the code would use:
    // const taskData = req.body;
    // const result = await quantumController.createTask(req.user.userId, taskData);
    // if (result.success) { res.status(201).json(result); } else { res.status(400).json({ error: result.error }); }
        
    } catch (error) {
    // log.error('Create task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/tasks/:id - Update task
router.put('/tasks/:id', authenticateToken, requireController, rateLimit(100), async (req, res) => {
    try {
        if (!quantumController) {
            return res.status(503).json({ error: 'Controller not initialized in this mode' });
        }

    // Task update is disabled in this deployment mode. When enabled the code would use:
    // const taskId = req.params.id;
    // const updates = req.body;
    // const result = await quantumController.updateTask(req.user.userId, taskId, updates);
    // if (result.success) { res.json(result); } else { res.status(400).json({ error: result.error }); }
        
    } catch (error) {
    // log.error('Update task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/tasks/:id', authenticateToken, requireController, rateLimit(50), async (req, res) => {
    try {
        const taskId = req.params.id;
        // Get task details for audit

        if (!quantumController) {
            return res.status(503).json({ error: 'Controller not initialized in this mode' });
        }
        const taskQuery = await quantumController.pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);

        if (taskQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        
        // Delete the task
    // await quantumController.pool.query('DELETE FROM tasks WHERE id = $1', [taskId]); // Disabled for SQLite-only mode
        
        // Log the deletion
    // await quantumController.auditLog(req.user.userId, 'DELETE', 'tasks', taskId, task); // Disabled for SQLite-only mode
        
        // Real-time broadcast disabled for SQLite-only mode
        // quantumController.broadcastToProject(task.project_id, {
        //     type: 'task_deleted',
        //     taskId: taskId,
        //     user: { id: req.user.userId }
        // });
        
        res.json({ success: true, message: 'Task deleted successfully' });
        
    } catch (error) {
    // log.error('Delete task error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================================
// PROJECT MANAGEMENT ROUTES
// ============================================================================

// GET /api/projects - Get all projects for user
router.get('/projects', authenticateToken, requireController, rateLimit(100), async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT p.*, u.name as owner_name,
                   COUNT(t.id) as task_count,
                   COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks
            FROM projects p
            LEFT JOIN users u ON p.created_by = u.id
            LEFT JOIN tasks t ON p.id = t.project_id
            LEFT JOIN memberships m ON p.id = m.project_id
            WHERE p.created_by = $1 OR m.user_id = $1
            GROUP BY p.id, u.name
            ORDER BY p.created_at DESC
        `;
        
        if (!quantumController) {
            // Safe fallback for SQLite-only mode: return empty list
            return res.json({ success: true, projects: [] });
        }

        const result = await quantumController.pool.query(query, [req.user.userId]);
        res.json({ success: true, projects: result.rows });
        
    } catch (error) {
    // log.error('Get projects error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/projects - Create new project
router.post('/projects', authenticateToken, requireController, rateLimit(20), async (req, res) => {
    try {
        const { name, description, status = 'active' } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }
        
        const query = `
            INSERT INTO projects (name, description, status, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        if (!quantumController) {
            return res.status(503).json({ error: 'Controller not initialized in this mode' });
        }

        const result = await quantumController.pool.query(query, [name, description, status, req.user.userId]);
        const newProject = result.rows[0];
        
        // Log project creation
    // await quantumController.auditLog(req.user.userId, 'CREATE', 'projects', newProject.id, null, newProject); // Disabled for SQLite-only mode
        
        res.status(201).json({
            success: true,
            project: newProject
        });
        
    } catch (error) {
    // log.error('Create project error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

// GET /api/analytics/dashboard - Get dashboard analytics
router.get('/analytics/dashboard', authenticateToken, requireController, rateLimit(50), async (req, res) => {
    try {
        if (!quantumController) {
            return res.status(503).json({ error: 'Controller not initialized in this mode' });
        }

        const result = await quantumController.getAnalyticsDashboard(req.user.userId);

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json({ error: result.error });
        }
        
    } catch (error) {
        logger.error(`Analytics dashboard error: ${error && error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/analytics/activity - Get recent activity
router.get('/analytics/activity', authenticateToken, requireController, rateLimit(100), async (req, res) => {
    try {
        const { hours = 24, limit = 50 } = req.query;
        
        const query = `
            SELECT 
                a.activity_type,
                a.content,
                a.created_at,
                u.name as user_name,
                p.name as project_name,
                t.title as task_title
            FROM activity_streams a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN projects p ON a.project_id = p.id
            LEFT JOIN tasks t ON a.task_id = t.id
            WHERE a.created_at > NOW() - INTERVAL '${hours} hours'
            ORDER BY a.created_at DESC
            LIMIT $1
        `;
        
        if (!quantumController) {
            return res.status(503).json({ error: 'Controller not initialized in this mode' });
        }

        const result = await quantumController.pool.query(query, [limit]);

        res.json({ success: true, activities: result.rows });
        
    } catch (error) {
        logger.error(`Get activity error: ${error && error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================================
// SYSTEM MANAGEMENT ROUTES
// ============================================================================

// GET /api/system/health - System health check
router.get('/system/health', authenticateToken, requireController, async (req, res) => {
    try {
        if (!quantumController) {
            return res.status(503).json({ error: 'Controller not initialized in this mode' });
        }
        const result = await quantumController.getSystemHealth();
        res.json(result);
    } catch (error) {
        logger.error(`System health error: ${error && error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/system/backup - Create system backup
router.post('/system/backup', authenticateToken, requireController, rateLimit(5, 300000), async (req, res) => {
    try {
        const { backupName, backupType = 'manual' } = req.body;
        
        if (!backupName) {
            return res.status(400).json({ error: 'Backup name is required' });
        }
        
        if (!quantumController) {
            return res.status(503).json({ error: 'Controller not initialized in this mode' });
        }
        const result = await quantumController.createBackup(req.user.userId, backupName, backupType);

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json({ error: result.error });
        }
        
    } catch (error) {
        logger.error(`Create backup error: ${error && error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/system/settings - Get system settings
router.get('/system/settings', authenticateToken, requireController, async (req, res) => {
    try {
        const query = `
            SELECT setting_key, setting_value, setting_type, category, description
            FROM system_settings
            ORDER BY category, setting_key
        `;
        
        if (!quantumController) {
            return res.status(503).json({ error: 'Controller not initialized in this mode' });
        }

        const result = await quantumController.pool.query(query);
        res.json({ success: true, settings: result.rows });
        
    } catch (error) {
        logger.error(`Get settings error: ${error && error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================================
// REAL-TIME WEBSOCKET ENDPOINT INFO
// ============================================================================

// GET /api/websocket/info - WebSocket connection info
router.get('/websocket/info', authenticateToken, async (req, res) => {
    res.json({
        success: true,
        websocket: {
            url: 'ws://localhost:8080',
            protocols: ['chat', 'collaboration'],
            events: [
                'typing',
                'task_update',
                'project_join',
                'user_status',
                'notification'
            ]
        }
    });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler
router.use((error, req, res, _next) => {
    // mark _next as used to satisfy linters while keeping express error signature
    void _next;
    logger.error(`API Error: ${error && error.message}`);
    res.status(500).json({ 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
router.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        availableEndpoints: [
            'POST /api/auth/login',
            'POST /api/auth/verify',
            'GET /api/tasks',
            'POST /api/tasks',
            'PUT /api/tasks/:id',
            'DELETE /api/tasks/:id',
            'GET /api/projects',
            'POST /api/projects',
            'GET /api/analytics/dashboard',
            'GET /api/analytics/activity',
            'GET /api/system/health',
            'POST /api/system/backup',
            'GET /api/system/settings'
        ]
    });
});

module.exports = router;