/**
 * Authentication middleware for admin routes
 * Supports role-based access: GODMODE, ADMIN, and standard
 */

const DIVINE_IDS = {
  GODMODE: '3ON-L3ON-0000-GODMODE',
  ADMIN: '3ON-GOD-0101-CORE-9999'
};

const ROLES = {
  GODMODE: 'GODMODE',
  ADMIN: 'ADMIN',
  STANDARD: 'STANDARD'
};

/**
 * Verify authentication token
 */
function verifyToken(token) {
  // In production, this would verify against 3ONUPI tokens
  // For demo purposes, we'll accept specific tokens
  
  if (!token) {
    return null;
  }

  // Check for divine tokens
  if (token === DIVINE_IDS.GODMODE) {
    return {
      userId: 'L3ON',
      role: ROLES.GODMODE,
      divineId: DIVINE_IDS.GODMODE,
      permissions: ['*']
    };
  }

  if (token === DIVINE_IDS.ADMIN) {
    return {
      userId: 'ADMIN',
      role: ROLES.ADMIN,
      divineId: DIVINE_IDS.ADMIN,
      permissions: ['read', 'write', 'admin', 'manage']
    };
  }

  // Check for standard tokens (starting with 3ONUPI-)
  if (token.startsWith('3ONUPI-')) {
    return {
      userId: 'user',
      role: ROLES.STANDARD,
      permissions: ['read']
    };
  }

  return null;
}

/**
 * Check if user has required permission
 */
function hasPermission(user, permission) {
  if (!user) return false;
  
  // GODMODE has all permissions
  if (user.permissions.includes('*')) return true;
  
  return user.permissions.includes(permission);
}

/**
 * Authentication middleware
 */
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.query.token ||
                req.headers['x-api-key'];

  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid authentication token required'
    });
  }

  // Attach user to request
  req.user = user;
  next();
}

/**
 * Role-based access control middleware
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Permission-based access control middleware
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `Permission '${permission}' required`
      });
    }

    next();
  };
}

module.exports = {
  authMiddleware,
  requireRole,
  requirePermission,
  ROLES,
  DIVINE_IDS
};
