const express = require('express');
const edificiosController = require("./edificios.controller");
const authMiddleware = require("../../shared/middlewares/auth.middleware");
const { roleGuard } = require("../../shared/middlewares/roles.middleware");

const router = express.Router();

router.use(authMiddleware);

// Rutas de gestión de edificios - solo PROPIETARIO
router.post('/', roleGuard(['PROPIETARIO']), edificiosController.createValidation, edificiosController.create);
router.get('/', roleGuard(['PROPIETARIO']), edificiosController.listar);
router.post('/asignar-admin', roleGuard(['PROPIETARIO']), edificiosController.asignarAdmin);
router.post('/upgrade-plan', roleGuard(['PROPIETARIO']), edificiosController.upgradePlan);
router.put('/:id', roleGuard(['PROPIETARIO']), edificiosController.update);
router.delete('/:id', roleGuard(['PROPIETARIO']), edificiosController.delete);
router.get('/:id/historial', roleGuard(['PROPIETARIO']), edificiosController.historialActividades);

// Rutas de accesos y alertas - permitidas para PROPIETARIO y ADMINISTRADOR
router.get('/accesos', roleGuard(['PROPIETARIO', 'ADMINISTRADOR']), edificiosController.accesosGlobales);
router.get('/alertas', roleGuard(['PROPIETARIO', 'ADMINISTRADOR']), edificiosController.alertasGlobales);
router.get('/:id/accesos', roleGuard(['PROPIETARIO', 'ADMINISTRADOR']), edificiosController.accesosPorEdificio);
router.get('/:id/alertas', roleGuard(['PROPIETARIO', 'ADMINISTRADOR']), edificiosController.alertasPorEdificio);

module.exports = router;
