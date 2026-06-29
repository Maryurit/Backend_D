const vehiculosService = require("./vehiculos.service");
const inquilinosRepository = require("../inquilinos/inquilinos.repository");
const { success, error } = require("../../shared/utils/response");
const { body, validationResult } = require('express-validator');

/**
 * Vehiculos Controller
 * Gestiona los vehículos de los inquilinos
 */
const vehiculosController = {

  createValidation: [
    body('placa').notEmpty().withMessage('La placa es obligatoria'),
    body('tipo').optional().isIn(['AUTO', 'MOTO']),
    body('modelo').optional(),
    body('color').optional(),
    body('inquilinoId').notEmpty().withMessage('El ID del inquilino es obligatorio')
  ],

  /**
   * Registrar nuevo vehículo para un inquilino
   */
  async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Datos inválidos', 400, errors.array());
    }

    try {
      const vehiculo = await vehiculosService.createVehiculo(
        req.body,
        req.body.inquilinoId,
        req.user.edificioId,
        req.user.id
      );
      return success(res, vehiculo, 'Vehículo registrado correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Listar todos los vehículos del edificio
   * - ADMINISTRADOR: ve todos los vehículos de su edificio
   * - INQUILINO: solo ve sus propios vehículos
   */
  async listar(req, res) {
    try {
      let vehiculos;
      if (req.user.rol === 'INQUILINO') {
        // INQUILINO: obtener su inquilinoId y luego listar sus vehículos
        const inquilino = await inquilinosRepository.findByUsuarioId(req.user.id);
        if (!inquilino) {
          return error(res, 'No se encontró registro de inquilino para este usuario', 404);
        }
        vehiculos = await vehiculosService.listarVehiculosPorInquilino(inquilino.id, req.user.edificioId);
      } else {
        // ADMINISTRADOR: ver todos los vehículos del edificio
        vehiculos = await vehiculosService.listarVehiculos(req.user.edificioId);
      }
      return success(res, vehiculos, 'Vehículos listados correctamente');
    } catch (err) {
      return error(res, err.message);
    }
  },

  /**
   * Obtener un vehículo por ID
   * - ADMINISTRADOR: puede ver cualquier vehículo de su edificio
   * - INQUILINO: solo puede ver sus propios vehículos
   */
  async obtener(req, res) {
    try {
      const { id } = req.params;
      const vehiculo = await vehiculosService.obtenerVehiculo(id, req.user.edificioId, req.user.rol, req.user.id);
      return success(res, vehiculo, 'Vehículo obtenido correctamente');
    } catch (err) {
      return error(res, err.message, err.message.includes('no encontrado') ? 404 : 400);
    }
  },

  /**
   * Actualizar vehículo
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const vehiculo = await vehiculosService.updateVehiculo(id, req.body, req.user.edificioId, req.user.id);
      return success(res, vehiculo, 'Vehículo actualizado correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Listar vehículos de un inquilino específico
   */
  async listarPorInquilino(req, res) {
    try {
      const { inquilinoId } = req.params;
      const vehiculos = await vehiculosService.listarVehiculosPorInquilino(inquilinoId, req.user.edificioId);
      return success(res, vehiculos, 'Vehículos del inquilino listados correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Eliminar vehículo permanentemente
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const vehiculo = await vehiculosService.deleteVehiculo(id, req.user.edificioId, req.user.id);
      return success(res, vehiculo, 'Vehículo eliminado correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Activar / Desactivar vehículo
   */
  async toggleActivo(req, res) {
    try {
      const { id } = req.params;
      const vehiculo = await vehiculosService.toggleActivo(id, req.user.edificioId, req.user.id);
      return success(res, vehiculo, 'Estado del vehículo actualizado');
    } catch (err) {
      return error(res, err.message, 400);
    }
  }
};

module.exports = vehiculosController;