const express = require('express');
const unidadesController = require("./unidades.controller");
const authMiddleware = require("../../shared/middlewares/auth.middleware");
const { roleGuard, adminEdificioGuard } = require("../../shared/middlewares/roles.middleware");

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);
// Solo administradores pueden acceder
router.use(roleGuard(['ADMINISTRADOR']));
// Verificar que solo gestione su propio edificio
router.use(adminEdificioGuard);

router.post('/', unidadesController.createValidation, unidadesController.create);
router.get('/', unidadesController.listar);
router.put('/:id', unidadesController.update);
router.delete('/:id', unidadesController.delete);



module.exports = router;
