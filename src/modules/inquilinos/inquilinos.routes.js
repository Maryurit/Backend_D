const express = require('express');
const inquilinosController = require("./inquilinos.controller");
const authMiddleware = require("../../shared/middlewares/auth.middleware");
const { roleGuard, adminEdificioGuard } = require("../../shared/middlewares/roles.middleware");

const router = express.Router();

// Requiere autenticación y rol de Administrador
router.use(authMiddleware);
router.use(roleGuard(['ADMINISTRADOR']));
// Solo puede gestionar su propio edificio
router.use(adminEdificioGuard);

/**
 * FLUJO COMPLETO: Crear inquilino con datos personales
 * POST /inquilinos/registro
 * El sistema crea automáticamente el usuario con rol INQUILINO
 */
router.post('/registro', inquilinosController.createCompletoValidation, inquilinosController.createCompleto);

/**
 * Crear inquilino con usuario existente
 * POST /inquilinos
 */
router.post('/', inquilinosController.createValidation, inquilinosController.create);

/**
 * Listar inquilinos del edificio
 * GET /inquilinos
 */
router.get('/', inquilinosController.listar);

/**
 * Obtener detalles de un inquilino
 * GET /inquilinos/:id
 */
router.get('/:id', inquilinosController.obtenerDetalles);

/**
 * Actualizar inquilino
 * PUT /inquilinos/:id
 */
router.put('/:id', inquilinosController.update);

/**
 * Finalizar contrato
 * PUT /inquilinos/:id/finalizar
 */
router.put('/:id/finalizar', inquilinosController.finalizarContrato);

module.exports = router;
