const express = require('express');
const dashboardController = require("./dashboards.controller");
const authMiddleware = require('../../shared/middlewares/auth.middleware');
const { roleGuard } = require('../../shared/middlewares/roles.middleware');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);



router.get('/inquilino',
  roleGuard(['INQUILINO']),
  dashboardController.getDashboardInquilino
);

// Dashboard del propietario
router.get('/propietario',
  roleGuard(['PROPIETARIO']),
  dashboardController.getDashboardPropietario
);

// Dashboard del administrador (por edificio)
router.get('/administrador/:edificioId',
  roleGuard(['ADMINISTRADOR']),
  dashboardController.getDashboardAdministrador
);

module.exports = router;