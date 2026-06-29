const authService = require('./auth.service');
const { success, error } = require('../../shared/utils/response');
const { body, validationResult } = require('express-validator');

const authController = {

  registerValidation: [
    body('nombres').notEmpty().withMessage('Nombres son obligatorios'),
    body('apellidos').notEmpty().withMessage('Apellidos son obligatorios'),
    body('email').isEmail().withMessage('Email válido requerido'),
    body('password').isLength({ min: 6 }).withMessage('Contraseña mínimo 6 caracteres'),
    body('dni').optional().isLength({ min: 5, max: 20 }),
    body('telefono').optional(),
    body('tipoDocumento').optional().isIn(['DNI', 'CE', 'PASAPORTE'])
  ],

  loginValidation: [
    body('email').isEmail(),
    body('password').notEmpty()
  ],

  async register(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Datos inválidos', 400, errors.array());
    }

    try {
      const resultado = await authService.register(req.body);
      return success(res, resultado, 'Propietario registrado correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async login(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Datos inválidos', 400, errors.array());
    }

    try {
      const resultado = await authService.login(req.body.email, req.body.password);
      return success(res, resultado, 'Login exitoso');
    } catch (err) {
      return error(res, err.message, 401);
    }
  }
};

module.exports = authController;
