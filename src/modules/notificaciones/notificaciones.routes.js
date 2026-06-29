const express = require('express');
const notificacionesController = require("./notificaciones.controller");
const authMiddleware = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener notificaciones del usuario
router.get('/', notificacionesController.obtenerNotificaciones);

// Marcar notificación como leída
router.put('/:id/leida', notificacionesController.marcarComoLeida);

// Ejecutar mantenimiento de notificaciones (solo admin/propietario)
router.post('/mantenimiento', notificacionesController.ejecutarMantenimiento);

module.exports = router;