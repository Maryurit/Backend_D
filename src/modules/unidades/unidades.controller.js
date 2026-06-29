const unidadesService = require("./unidades.service");
const { success, error } = require("../../shared/utils/response");
const { body, validationResult } = require('express-validator');

/**
 * Unidades Controller
 * Soporta creación individual, múltiple y por rango
 */
const unidadesController = {

  /**
   * Validación para creación individual
   */
  createValidation: [
    body('numero').notEmpty().withMessage('El número de unidad es obligatorio'),
    body('piso').isInt({ min: 0 }).withMessage('El piso debe ser un número entero positivo'),
    body('capacidadMaxima').optional().isInt({ min: 1 })
  ],

  /**
   * Crear unidades - Soporta 3 modos:
   * 1. Individual
   * 2. Múltiple (array)
   * 3. Por rango (desde - hasta)
   */
  async create(req, res) {
    try {
      const edificioId = req.body.edificioId || req.user.edificioId;

      if (!edificioId) {
        return error(res, 'El ID del edificio es obligatorio', 400);
      }

      let resultado;

      // Modo 3: Creación por rango (ej: del 101 al 105)
      if (req.body.desde && req.body.hasta) {
        resultado = await unidadesService.createUnidadesPorRango(
          req.body.desde, 
          req.body.hasta, 
          req.body.piso, 
          req.body.capacidadMaxima || 2,
          edificioId, 
          req.user.id
        );
      } 
      // Modo 2: Creación múltiple (array)
      else if (Array.isArray(req.body.unidades)) {
        resultado = await unidadesService.createUnidades(req.body.unidades, edificioId, req.user.id);
      } 
      // Modo 1: Creación individual
      else {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return error(res, 'Datos inválidos', 400, errors.array());
        }
        resultado = await unidadesService.createUnidades(req.body, edificioId, req.user.id);
      }

      return success(res, resultado, 'Unidad(es) creada(s) correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async listar(req, res) {
    try {
      let edificioId = req.params.edificioId;

      // Si es ADMINISTRADOR y no hay edificioId en params, obtenerlo de su asignación
      if (req.user.rol === 'ADMINISTRADOR' && !edificioId) {
        const prisma = require('../../shared/config/database');
        const admin = await prisma.administrador.findFirst({
          where: {
            usuarioId: req.user.id,
            activo: true
          }
        });

        if (!admin) {
          return error(res, 'No tienes edificios asignados', 403);
        }

        edificioId = admin.edificioId;
      }

      if (!edificioId) {
        return error(res, 'El ID del edificio es obligatorio', 400);
      }

      const unidades = await unidadesService.listarUnidades(edificioId);
      return success(res, unidades, 'Unidades listadas correctamente');
    } catch (err) {
      return error(res, err.message);
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const unidad = await unidadesService.updateUnidad(id, req.body, req.user.edificioId, req.user.id);
      return success(res, unidad, 'Unidad actualizada correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      await unidadesService.deleteUnidad(id, req.user.edificioId, req.user.id);
      return success(res, null, 'Unidad desactivada correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  }





  
};














module.exports = unidadesController;
