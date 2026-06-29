const camarasService = require("./camaras.service");
const { success, error } = require("../../shared/utils/response");
const { body, validationResult } = require('express-validator');

/**
 * Cámaras Controller
 * Solo el administrador del edificio puede registrar y ver sus cámaras
 */
const camarasController = {

  createValidation: [
    body('nombre').notEmpty().withMessage('El nombre de la cámara es obligatorio'),
    body('ubicacion').optional(),
    body('urlStream').notEmpty().withMessage('La URL RTSP o HTTP de la cámara es obligatoria')
  ],

  updateValidation: [
    body('nombre').optional().notEmpty(),
    body('ubicacion').optional(),
    body('urlStream').optional().notEmpty(),
    body('activa').optional().isBoolean()
  ],

  /**
   * Registrar nueva cámara
   */
  async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Datos inválidos', 400, errors.array());
    }

    try {
      const edificioId = req.user.edificioId;
      if (!edificioId) {
        return error(res, "No tienes un edificio asignado", 403);
      }

      const camara = await camarasService.registrarCamara(
        req.body,
        edificioId,
        req.user.id
      );
      return success(res, camara, 'Cámara registrada correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },
  /**
   * Listar cámaras del edificio
   */
  async listar(req, res) {
    try {
      const camaras = await camarasService.listarCamaras(req.user.edificiosIds || req.user.edificioId);
      return success(res, camaras, 'Cámaras listadas correctamente');
    } catch (err) {
      return error(res, err.message);
    }
  },

  /**
   * Obtener cámara por ID
   */
  async getById(req, res) {
    try {
      const camara = await camarasService.getById(req.params.id, req.user.edificiosIds || req.user.edificioId);
      if (!camara) return error(res, 'Cámara no encontrada', 404);
      return success(res, camara);
    } catch (err) {
      return error(res, err.message);
    }
  },

  /**
   * Actualizar cámara
   */
  async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Datos inválidos', 400, errors.array());
    }

    try {
      const camara = await camarasService.actualizarCamara(
        req.params.id,
        req.body,
        req.user.edificioId
      );
      return success(res, camara, 'Cámara actualizada correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Eliminar cámara (Soft Delete)
   */
  async delete(req, res) {
    try {
      const result = await camarasService.eliminarCamara(req.params.id, req.user.edificioId);
      return success(res, result, 'Cámara eliminada correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Obtener cámaras activas (para servicio IA)
   */
  async getCamarasActivas(req, res) {
    try {
      const camaras = await camarasService.getCamarasActivas();
      return success(res, camaras, 'Cámaras activas obtenidas');
    } catch (err) {
      return error(res, 'Error al obtener cámaras activas', 500);
    }
  }

};

module.exports = camarasController;