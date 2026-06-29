const express = require('express');
const metricasController = require("./metricas.controller");
const authMiddleware = require('../../shared/middlewares/auth.middleware');
const { roleGuard } = require('../../shared/middlewares/roles.middleware');
const planValidation = require('../../shared/middlewares/planValidation.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener métricas generales (solo propietario/administrador)
router.get('/generales',
  roleGuard(['PROPIETARIO', 'ADMINISTRADOR']),
  metricasController.obtenerMetricasGenerales
);

// Métricas básicas — disponibles en todos los planes con suscripción activa
router.get('/seguridad/:edificioId', metricasController.obtenerMetricasSeguridad);
router.get('/ocupacion/:edificioId', metricasController.obtenerMetricasOcupacion);

// Métricas avanzadas — solo plan Premium (permiteMetricasAvanzadas)
router.get('/financieras/:edificioId',
  planValidation.validarMetricasAvanzadas,
  metricasController.obtenerMetricasFinancieras
);
router.get('/ia/:edificioId',
  planValidation.validarMetricasAvanzadas,
  metricasController.obtenerMetricasIA
);
router.get('/completas/:edificioId',
  planValidation.validarMetricasAvanzadas,
  metricasController.obtenerMetricasCompletas
);

module.exports = router;