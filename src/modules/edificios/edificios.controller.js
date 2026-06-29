const edificiosService = require("./edificios.service");
const { success, error } = require("../../shared/utils/response");
const { body, validationResult } = require("express-validator");

/**
 * Edificios Controller - Solo accesible por PROPIETARIO
 */
const edificiosController = {

  createValidation: [
    body('nombre').notEmpty().withMessage('El nombre del edificio es obligatorio'),
    body('direccion').optional(),
    body('ciudad').optional(),
    body('provincia').optional(),
    body('distrito').optional()
  ],

  /**
   * Crear nuevo edificio
   */
  async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Datos inválidos', 400, errors.array());
    }

    try {
      const resultado = await edificiosService.createEdificio(req.body, req.user.id);
      return success(res, resultado, 'Edificio creado correctamente con plan GRATUITO');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Listar mis edificios
   */
  async listar(req, res) {
    try {
      const edificios = await edificiosService.listarEdificios(req.user.id);
      return success(res, edificios, 'Edificios obtenidos correctamente');
    } catch (err) {
      return error(res, err.message);
    }
  },

    /**
   * Asignar administrador a edificio
   */
  async asignarAdmin(req, res) {
    try {
      const { edificioId, adminId } = req.body;
      const resultado = await edificiosService.asignarAdministrador(edificioId, adminId, req.user.id);
      return success(res, resultado, 'Administrador asignado correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Desasignar administrador de un edificio
   */
  async desasignarAdmin(req, res) {
    try {
      const { edificioId } = req.body;
      const resultado = await edificiosService.desasignarAdministrador(edificioId, req.user.id);
      return success(res, resultado, 'Administrador desasignado correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Ver accesos globales
   */
  async accesosGlobales(req, res) {
    try {
      const accesos = await edificiosService.verAccesosGlobales(req.user);
      return success(res, accesos, 'Accesos globales obtenidos');
    } catch (err) {
      return error(res, err.message);
    }
  },

  /**
   * Ver alertas globales
   */
  async alertasGlobales(req, res) {
    try {
      const alertas = await edificiosService.verAlertasGlobales(req.user);
      return success(res, alertas, 'Alertas globales obtenidas');
    } catch (err) {
      return error(res, err.message);
    }
  },

  /**
   * Upgrade de plan de un edificio (con pago)
   *
   * Body sin tokenPago → inicia pago (devuelve tokenPago, codigoPago, QR).
   * Body con tokenPago → confirma pago, emite boleta y activa el plan.
   */
  async upgradePlan(req, res) {
    try {
      const { edificioId, nuevoPlan, plan, tokenPago, operacion } = req.body;
      const nombrePlan = (nuevoPlan || plan)?.toUpperCase();
      const op = (operacion || 'UPGRADE').toUpperCase();

      if (!edificioId) {
        return error(res, 'edificioId es requerido', 400);
      }
      if (!tokenPago && op === 'UPGRADE' && !nombrePlan) {
        return error(res, 'plan/nuevoPlan es requerido para upgrade', 400);
      }

      const resultado = await edificiosService.upgradePlan(
        edificioId,
        nombrePlan,
        req.user.id,
        tokenPago || null,
        op
      );

      const mensaje = tokenPago
        ? 'Pago confirmado, boleta emitida y plan activado'
        : 'Sesión de pago iniciada. Confirma con tokenPago tras pagar.';

      return success(res, resultado, mensaje);
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

    /**
   * Actualizar edificio
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const resultado = await edificiosService.updateEdificio(id, req.body, req.user.id);
      return success(res, resultado, 'Edificio actualizado correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Eliminar edificio (soft delete)
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      await edificiosService.deleteEdificio(id, req.user.id);
      return success(res, null, 'Edificio eliminado correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

    /**
   * Ver historial de actividades de un edificio
   */
  async historialActividades(req, res) {
    try {
      const { id } = req.params;
      const historial = await edificiosService.verHistorialActividades(id, req.user.id);
      return success(res, historial, 'Historial de actividades obtenido');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Ver accesos de un edificio específico (filtrado por edificio)
   * Similar a accesosGlobales pero para un solo edificio
   */
  async accesosPorEdificio(req, res) {
    try {
      const { id } = req.params;
      const filtros = {
        desde: req.query.desde,
        hasta: req.query.hasta,
        tipo: req.query.tipo,
        resultado: req.query.resultado
      };
      const accesos = await edificiosService.verAccesosPorEdificio(id, req.user, filtros);
      return success(res, accesos, 'Accesos del edificio obtenidos');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Ver alertas de un edificio específico (filtrado por edificio)
   * Similar a alertasGlobales pero para un solo edificio
   */
  async alertasPorEdificio(req, res) {
    try {
      const { id } = req.params;
      const alertas = await edificiosService.verAlertasPorEdificio(id, req.user);
      return success(res, alertas, 'Alertas del edificio obtenidas');
    } catch (err) {
      return error(res, err.message, 400);
    }
  }
};

module.exports = edificiosController;
