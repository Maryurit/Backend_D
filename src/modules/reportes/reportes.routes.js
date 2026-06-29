const express = require('express');
const reportesController = require("./reportes.controller");
const authMiddleware = require('../../shared/middlewares/auth.middleware');
const { roleGuard } = require('../../shared/middlewares/roles.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Generar reporte de accesos (solo propietario/administrador)
router.get('/accesos/:edificioId',
  roleGuard(['PROPIETARIO', 'ADMINISTRADOR']),
  reportesController.generarReporteAccesos
);

// Generar reporte de inquilinos (solo propietario/administrador)
router.get('/inquilinos/:edificioId',
  roleGuard(['PROPIETARIO', 'ADMINISTRADOR']),
  reportesController.generarReporteInquilinos
);

// Generar reporte financiero (solo propietario/administrador)
router.get('/financiero/:edificioId',
  roleGuard(['PROPIETARIO', 'ADMINISTRADOR']),
  reportesController.generarReporteFinanciero
);

module.exports = router;