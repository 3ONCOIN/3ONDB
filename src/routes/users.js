const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Public routes with stricter rate limiting
router.post('/register', authLimiter, userController.register.bind(userController));
router.post('/login', authLimiter, userController.login.bind(userController));

// Protected routes with general rate limiting
router.get('/', authMiddleware, apiLimiter, userController.getUsers.bind(userController));
router.get('/:id', authMiddleware, apiLimiter, userController.getUser.bind(userController));
router.put('/:id', authMiddleware, apiLimiter, userController.updateUser.bind(userController));
router.delete('/:id', authMiddleware, apiLimiter, userController.deleteUser.bind(userController));

module.exports = router;
