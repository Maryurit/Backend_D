const express = require('express');
const camarasController = require("./camaras.controller");
const authMiddleware = require("../../shared/middlewares/auth.middleware");
const serviceAuthMiddleware = require("../../shared/middlewares/serviceAuth.middleware");
const { roleGuard } = require("../../shared/middlewares/roles.middleware");

const router = express.Router();

// Ruta para que el servicio IA obtenga todas las cámaras activas
router.get('/activas', 
  serviceAuthMiddleware,
  camarasController.getCamarasActivas
);

router.use(authMiddleware);

router.post('/', roleGuard(['ADMINISTRADOR']), camarasController.createValidation, camarasController.create);
router.get('/', roleGuard(['ADMINISTRADOR', 'PROPIETARIO']), camarasController.listar);
router.get('/:id', roleGuard(['ADMINISTRADOR', 'PROPIETARIO']), camarasController.getById);
router.put('/:id', roleGuard(['ADMINISTRADOR']), camarasController.updateValidation, camarasController.update);
router.delete('/:id', roleGuard(['ADMINISTRADOR']), camarasController.delete);

module.exports = router;