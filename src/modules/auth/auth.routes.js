const express = require('express');
const authController = require('./auth.controller');

const router = express.Router();

// Rutas de autenticación
router.post('/register', authController.registerValidation, authController.register);
router.post('/login', authController.loginValidation, authController.login);

module.exports = router;
