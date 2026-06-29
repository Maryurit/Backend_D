const express = require('express');
const accesosController = require("./accesos.controller");
const authMiddleware = require('../../shared/middlewares/auth.middleware');
const serviceAuthMiddleware = require('../../shared/middlewares/serviceAuth.middleware');
const planValidation = require('../../shared/middlewares/planValidation.middleware');

const router = express.Router();

// Historial de accesos — ventana limitada según plan del edificio
router.get('/',
  authMiddleware,
  planValidation.validarHistorial,
  accesosController.obtenerHistorial
);

router.post('/registrar',
  serviceAuthMiddleware,
  planValidation.validarAnalisisIAServicio,
  accesosController.registrar
);

module.exports = router;