// 3ONDB v3 INFINITE CORE EDITION - AUTHENTICATION & RBAC MIDDLEWARE
// Complete role-based access control system

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const log = require('../../../lib/cli-logger.js');
const { pool } = require('./database');

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================

const JWT_SECRET = process.env.THREE_ON_JWT_SECRET || '3ONDB-INFINITE-CORE-SECRET';
const JWT_REFRESH_SECRET = process.env.THREE_ON_REFRESH_SECRET || '3ONDB-REFRESH-SECRET';
const BCRYPT_ROUNDS = 12;

class AuthenticationSystem {
    constructor() {
        this.roles = {
            SUPER_ADMIN: 'super_admin',
            ADMIN: 'admin', 
            USER: 'user',
            GUEST: 'guest',
            API_CLIENT: 'api_client'
        };
        
        this.permissions = {
            // System management
            'system:read': [this.roles.SUPER_ADMIN, this.roles.ADMIN],
            'system:write': [this.roles.SUPER_ADMIN],
            'system:backup': [this.roles.SUPER_ADMIN, this.roles.ADMIN],
            'system:restore': [this.roles.SUPER_ADMIN],
            
            // User management
            'users:read': [this.roles.SUPER_ADMIN, this.roles.ADMIN],
            'users:write': [this.roles.SUPER_ADMIN, this.roles.ADMIN],
            'users:delete': [this.roles.SUPER_ADMIN],
            
            // Data access
            'data:read': [this.roles.SUPER_ADMIN, this.roles.ADMIN, this.roles.USER],
            'data:write': [this.roles.SUPER_ADMIN, this.roles.ADMIN, this.roles.USER],
            'data:delete': [this.roles.SUPER_ADMIN, this.roles.ADMIN],
            
            // API keys
            'apikeys:read': [this.roles.SUPER_ADMIN, this.roles.ADMIN],
            'apikeys:write': [this.roles.SUPER_ADMIN, this.roles.ADMIN],
            
            // Webhooks
            'webhooks:read': [this.roles.SUPER_ADMIN, this.roles.ADMIN],
            'webhooks:write': [this.roles.SUPER_ADMIN, this.roles.ADMIN],
            
            // Analytics
            'analytics:read': [this.roles.SUPER_ADMIN, this.roles.ADMIN, this.roles.USER],
            'analytics:system': [this.roles.SUPER_ADMIN, this.roles.ADMIN],
            
            // AI features
            'ai:query': [this.roles.SUPER_ADMIN, this.roles.ADMIN, this.roles.USER],
            'ai:admin': [this.roles.SUPER_ADMIN, this.roles.ADMIN]
        };
        
        log.info('🔐 3ONDB Authentication System initialized');
    }

    // ========================================================================
    // JWT TOKEN MANAGEMENT
    // ========================================================================

    generateTokens(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenant_id || 1,
            permissions: this.getUserPermissions(user.role)
        };

        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
        const refreshToken = jwt.sign(
            { userId: user.id, tokenId: crypto.randomUUID() }, 
            JWT_REFRESH_SECRET, 
            { expiresIn: '7d' }
        );

        return { accessToken, refreshToken };
    }

    verifyAccessToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid or expired access token');
        }
    }

    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, JWT_REFRESH_SECRET);
        } catch (error) {
            throw new Error('Invalid or expired refresh token');
        }
    }

    getUserPermissions(role) {
        const userPermissions = [];
        for (const [permission, allowedRoles] of Object.entries(this.permissions)) {
            if (allowedRoles.includes(role)) {
                userPermissions.push(permission);
            }
        }
        return userPermissions;
    }

    // ========================================================================
    // PASSWORD MANAGEMENT
    // ========================================================================

    async hashPassword(password) {
        return bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }

    generateSecurePassword(length = 16) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }

    // ========================================================================
    // USER AUTHENTICATION
    // ========================================================================

    async authenticateUser(email, password, tenantId = 1) {
        try {
            const query = `
                SELECT u.*, t.name as tenant_name, t.settings as tenant_settings
                FROM users u
                LEFT JOIN tenants t ON u.tenant_id = t.id
                WHERE u.email = $1 AND u.tenant_id = $2 AND u.is_active = true
            `;
            const result = await pool.query(query, [email, tenantId]);

            if (result.rows.length === 0) {
                throw new Error('Invalid email or password');
            }

            const user = result.rows[0];
            
            // Verify password
            const isValidPassword = await this.verifyPassword(password, user.password);
            if (!isValidPassword) {
                throw new Error('Invalid email or password');
            }

            // Generate tokens
            const tokens = this.generateTokens(user);

            // Create session record
            const sessionId = crypto.randomUUID();
            await pool.query(`
                INSERT INTO sessions (id, user_id, jwt_id, expires_at)
                VALUES ($1, $2, $3, $4)
            `, [sessionId, user.id, tokens.refreshToken.split('.')[2], new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]);

            // Log successful authentication
            await this.logSystemEvent('info', 'User authenticated successfully', {
                userId: user.id,
                email: user.email,
                tenantId: user.tenant_id
            }, 'auth');

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    tenantId: user.tenant_id,
                    tenantName: user.tenant_name,
                    permissions: this.getUserPermissions(user.role)
                },
                tokens,
                sessionId
            };

        } catch (error) {
            await this.logSystemEvent('error', 'Authentication failed', {
                email,
                error: error.message
            }, 'auth');
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    async refreshTokens(refreshToken) {
        try {
            const decoded = this.verifyRefreshToken(refreshToken);
            
            // Check if session exists and is valid
            const sessionQuery = `
                SELECT s.*, u.* FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.user_id = $1 AND s.expires_at > NOW()
            `;
            const sessionResult = await pool.query(sessionQuery, [decoded.userId]);
            
            if (sessionResult.rows.length === 0) {
                throw new Error('Session expired or invalid');
            }

            const user = sessionResult.rows[0];
            const newTokens = this.generateTokens(user);

            // Update session
            await pool.query(`
                UPDATE sessions 
                SET jwt_id = $1, expires_at = $2
                WHERE user_id = $3
            `, [newTokens.refreshToken.split('.')[2], new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), user.id]);

            return {
                success: true,
                tokens: newTokens
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async logout(userId, sessionId = null) {
        try {
            let query = `UPDATE sessions SET expires_at = NOW() WHERE user_id = $1`;
            const params = [userId];

            if (sessionId) {
                query += ` AND id = $2`;
                params.push(sessionId);
            }

            await pool.query(query, params);

            await this.logSystemEvent('info', 'User logged out', {
                userId,
                sessionId
            }, 'auth');

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========================================================================
    // MIDDLEWARE FUNCTIONS
    // ========================================================================

    authenticateToken() {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

                if (!token) {
                    return res.status(401).json({ 
                        error: 'Access token required',
                        code: 'TOKEN_MISSING'
                    });
                }

                const decoded = this.verifyAccessToken(token);
                
                // Set user context for database operations
                await pool.query(`SELECT set_config('app.user_id', $1, true)`, [decoded.userId]);
                await pool.query(`SELECT set_config('app.tenant_id', $1, true)`, [decoded.tenantId]);

                req.user = decoded;
                next();

            } catch (error) {
                return res.status(403).json({ 
                    error: 'Invalid or expired token',
                    code: 'TOKEN_INVALID'
                });
            }
        };
    }

    requireRole(...allowedRoles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ 
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    required: allowedRoles,
                    current: req.user.role
                });
            }

            next();
        };
    }

    requirePermission(...requiredPermissions) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ 
                    error: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            const hasPermission = requiredPermissions.some(permission => 
                req.user.permissions && req.user.permissions.includes(permission)
            );

            if (!hasPermission) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    required: requiredPermissions,
                    current: req.user.permissions
                });
            }

            next();
        };
    }

    requireTenant() {
        return (req, res, next) => {
            if (!req.user || !req.user.tenantId) {
                return res.status(400).json({ 
                    error: 'Tenant context required',
                    code: 'TENANT_REQUIRED'
                });
            }

            // Set tenant filter for all queries
            req.tenantId = req.user.tenantId;
            next();
        };
    }

    // ========================================================================
    // API KEY AUTHENTICATION
    // ========================================================================

    async verifyApiKey(apiKey) {
        try {
            const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
            
            const query = `
                SELECT ak.*, u.name as owner_name, u.role as owner_role
                FROM api_keys ak
                LEFT JOIN users u ON ak.owner_id = u.id
                WHERE ak.hashed_key = $1 AND ak.revoked_at IS NULL
            `;
            
            const result = await pool.query(query, [hashedKey]);
            
            if (result.rows.length === 0) {
                throw new Error('Invalid API key');
            }

            const apiKeyData = result.rows[0];

            // Update usage count and last used
            await pool.query(`
                UPDATE api_keys 
                SET usage_count = usage_count + 1, last_used_at = NOW()
                WHERE id = $1
            `, [apiKeyData.id]);

            return {
                success: true,
                apiKey: apiKeyData,
                user: {
                    id: apiKeyData.owner_id,
                    name: apiKeyData.owner_name,
                    role: this.roles.API_CLIENT,
                    scopes: apiKeyData.scopes,
                    permissions: ['data:read'] // Basic permissions for API clients
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    authenticateApiKey() {
        return async (req, res, next) => {
            const apiKey = req.headers['x-api-key'];

            if (!apiKey) {
                return next(); // Allow other auth methods
            }

            const result = await this.verifyApiKey(apiKey);

            if (!result.success) {
                return res.status(401).json({ 
                    error: result.error,
                    code: 'API_KEY_INVALID'
                });
            }

            req.user = result.user;
            req.apiKey = result.apiKey;
            next();
        };
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    async logSystemEvent(level, message, metadata = {}, source = 'auth') {
        try {
            await pool.query(`
                INSERT INTO system_logs (level, message, metadata, source)
                VALUES ($1, $2, $3, $4)
            `, [level, message, JSON.stringify(metadata), source]);
        } catch (error) {
            log.error('Failed to log system event:', error);
        }
    }

    async createUser(userData, creatorRole = 'admin') {
        try {
            const { name, email, role = 'user', password, tenantId = 1 } = userData;

            // Validate permissions
            if (creatorRole !== 'super_admin' && role === 'super_admin') {
                throw new Error('Cannot create super admin user');
            }

            // Check if user exists
            const existingUser = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
                [email, tenantId]
            );

            if (existingUser.rows.length > 0) {
                throw new Error('User already exists');
            }

            // Generate password if not provided
            const userPassword = password || this.generateSecurePassword();
            const hashedPassword = await this.hashPassword(userPassword);

            // Create user
            const query = `
                INSERT INTO users (name, email, password, role, tenant_id, is_active)
                VALUES ($1, $2, $3, $4, $5, true)
                RETURNING id, name, email, role, tenant_id, created_at
            `;

            const result = await pool.query(query, [name, email, hashedPassword, role, tenantId]);
            const newUser = result.rows[0];

            await this.logSystemEvent('info', 'User created', {
                userId: newUser.id,
                email: newUser.email,
                role: newUser.role
            }, 'user_management');

            return {
                success: true,
                user: newUser,
                temporaryPassword: password ? null : userPassword
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========================================================================
    // SESSION MANAGEMENT
    // ========================================================================

    async getActiveSessions(userId) {
        const query = `
            SELECT id, ip, user_agent, issued_at, expires_at, last_activity
            FROM sessions
            WHERE user_id = $1 AND expires_at > NOW()
            ORDER BY last_activity DESC
        `;
        
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    async revokeSession(sessionId, userId) {
        const query = `
            UPDATE sessions 
            SET expires_at = NOW()
            WHERE id = $1 AND user_id = $2
        `;
        
        await pool.query(query, [sessionId, userId]);
        
        await this.logSystemEvent('info', 'Session revoked', {
            sessionId,
            userId
        }, 'auth');
    }
}

// Export singleton instance
const authSystem = new AuthenticationSystem();
module.exports = authSystem;