const express = require('express');
const vehiculosController = require("./vehiculos.controller");
const authMiddleware = require("../../shared/middlewares/auth.middleware");
const { roleGuard, adminEdificioGuard } = require("../../shared/middlewares/roles.middleware");

const router = express.Router();

// Requiere autenticación
router.use(authMiddleware);

// Rutas de lectura - permitidas para ADMINISTRADOR e INQUILINO
router.get('/', roleGuard(['ADMINISTRADOR', 'INQUILINO']), vehiculosController.listar);
router.get('/:id', roleGuard(['ADMINISTRADOR', 'INQUILINO']), vehiculosController.obtener);
router.get('/inquilino/:inquilinoId', roleGuard(['ADMINISTRADOR', 'INQUILINO']), vehiculosController.listarPorInquilino);

// Rutas de escritura - solo ADMINISTRADOR
router.use(roleGuard(['ADMINISTRADOR']));
router.use(adminEdificioGuard);

router.post('/', vehiculosController.createValidation, vehiculosController.create);
router.put('/:id', vehiculosController.update);
router.put('/:id/toggle', vehiculosController.toggleActivo);
router.delete('/:id', vehiculosController.delete);

module.exports = router;