const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const postgres = require('../config/postgres');
const logger = require('../utils/logger');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

class UserController {
  async register(req, res) {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required',
      });
    }

    try {
      // Check if user exists
      const existing = await postgres.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const result = await postgres.query(`
        INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, username, email, created_at
      `, [uuidv4(), username, email, passwordHash]);

      const user = result.rows[0];

      // Generate token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        config.security.jwtSecret,
        { expiresIn: config.security.jwtExpiresIn }
      );

      res.status(201).json({
        success: true,
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      logger.error('Error registering user:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    try {
      // Get user
      const result = await postgres.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      const user = result.rows[0];

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Update last login
      await postgres.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        config.security.jwtSecret,
        { expiresIn: config.security.jwtExpiresIn }
      );

      // Remove sensitive data
      delete user.password_hash;

      res.json({
        success: true,
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      logger.error('Error logging in:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getUsers(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const result = await postgres.query(`
        SELECT id, username, email, created_at, updated_at, last_login, is_active
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [parseInt(limit), parseInt(offset)]);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getUser(req, res) {
    try {
      const { id } = req.params;

      const result = await postgres.query(`
        SELECT id, username, email, created_at, updated_at, last_login, is_active, metadata
        FROM users
        WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { username, email, metadata } = req.body;

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (username) {
        updates.push(`username = $${paramCount}`);
        values.push(username);
        paramCount++;
      }

      if (email) {
        updates.push(`email = $${paramCount}`);
        values.push(email);
        paramCount++;
      }

      if (metadata) {
        updates.push(`metadata = $${paramCount}`);
        values.push(JSON.stringify(metadata));
        paramCount++;
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await postgres.query(`
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, username, email, created_at, updated_at, last_login, is_active, metadata
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Soft delete by setting is_active to false
      const result = await postgres.query(`
        UPDATE users
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.json({
        success: true,
        message: 'User deactivated successfully',
      });
    } catch (error) {
      logger.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new UserController();
