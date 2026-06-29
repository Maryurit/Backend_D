const express = require('express');
const pagosController = require("./pagos.controller");
const authMiddleware = require('../../shared/middlewares/auth.middleware');
const { roleGuard } = require('../../shared/middlewares/roles.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleGuard(['PROPIETARIO']));

/**
 * Upgrade de plan: POST /api/edificios/upgrade-plan
 * Renovación mensual: rutas abajo o upgrade-plan con operacion: 'RENOVACION'
 */

router.get('/upgrade/sesion', pagosController.consultarSesion);
router.get('/suscripcion/:edificioId', pagosController.estadoSuscripcion);

router.post('/renovacion/iniciar', pagosController.iniciarRenovacion);
router.post('/renovacion/confirmar', pagosController.confirmarRenovacion);

// Descargar PDF antes que /boletas/:edificioId para no confundir rutas
router.get('/boletas/comprobante/:boletaId/descargar', pagosController.descargarBoleta);
router.get('/boletas/:edificioId', pagosController.obtenerBoletas);

router.get('/estadisticas/:edificioId', pagosController.obtenerEstadisticas);

// Ruta de mantenimiento para actualizar registros viejos de suscripciones
// POST /api/pagos/mantenimiento/actualizar-registros-viejos
router.post('/mantenimiento/actualizar-registros-viejos', pagosController.actualizarRegistrosViejos);

module.exports = router;
