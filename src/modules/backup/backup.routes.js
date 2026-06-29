const express = require('express');
const backupController = require("./backup.controller");
const authMiddleware = require('../../shared/middlewares/auth.middleware');
const { roleGuard } = require('../../shared/middlewares/roles.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleGuard(['PROPIETARIO', 'ADMINISTRADOR']));

router.post('/crear', backupController.crearBackup);
router.get('/', backupController.listarBackups);
router.get('/:nombreBackup', backupController.obtenerBackup);

module.exports = router;