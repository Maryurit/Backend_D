const express = require('express');
const { imagenesController, upload } = require("./imagenes.controller");
const authMiddleware = require("../../shared/middlewares/auth.middleware");
const serviceAuthMiddleware = require("../../shared/middlewares/serviceAuth.middleware");
const { roleGuard, adminEdificioGuard } = require("../../shared/middlewares/roles.middleware");
const planValidation = require("../../shared/middlewares/planValidation.middleware");

const router = express.Router();

// Ruta para que la IA suba imágenes (sin JWT, usa SERVICE_TOKEN)
router.post('/subir-ia',
  serviceAuthMiddleware,
  planValidation.validarImagenes,
  upload.single('imagen'),
  imagenesController.subirDesdeIA
);

// Rutas protegidas para administradores/propietarios
router.use(authMiddleware);
router.use(roleGuard(['ADMINISTRADOR', 'PROPIETARIO']));
router.use(adminEdificioGuard);

router.get('/', planValidation.validarConsultas, imagenesController.listar);
router.get('/:id', imagenesController.obtenerImagen);
router.delete('/:id', imagenesController.eliminar);

module.exports = router;