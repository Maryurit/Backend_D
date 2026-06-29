const express = require('express');
const usuariosController = require("./usuarios.controller");
const authMiddleware = require("../../shared/middlewares/auth.middleware");
const { roleGuard } = require("../../shared/middlewares/roles.middleware");

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// ==================== RUTAS EXCLUSIVAS DEL PROPIETARIO ====================
router.use('/admin', (req, res, next) => {
  roleGuard(['PROPIETARIO'])(req, res, next);
});

// Crear y listar administradores (SOLO Propietario)
router.post('/admin', usuariosController.createAdminValidation, usuariosController.createAdmin);
router.get('/admin', usuariosController.listarAdministradores);

// Actualizar y eliminar administradores (SOLO Propietario)
router.put('/admin/:id', usuariosController.updateAdmin);
router.delete('/admin/:id', usuariosController.deleteAdmin);

// ==================== RUTAS DEL ADMINISTRADOR ====================

// Listar usuarios inquilinos (solo Administrador)
router.get('/inquilinos-usuarios', (req, res, next) => {
  roleGuard(['ADMINISTRADOR'])(req, res, next);
}, usuariosController.listarUsuariosInquilinos);

// Crear usuario inquilino (solo Administrador)
router.post('/inquilino-usuario', (req, res, next) => {
  roleGuard(['ADMINISTRADOR'])(req, res, next);
}, usuariosController.createInquilinoUsuario);

module.exports = router;