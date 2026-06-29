const inquilinosService = require("./inquilinos.service");
const { success, error } = require("../../shared/utils/response");
const { body, validationResult } = require('express-validator');

/**
 * Inquilinos Controller
 * Gestiona la creación y administración de inquilinos
 */
const inquilinosController = {

  /**
   * Validación para crear inquilino CON USUARIO (flujo completo)
   * El sistema crea automáticamente el usuario con rol INQUILINO
   */
  createCompletoValidation: [
    body('nombres').trim().notEmpty().withMessage('Nombres obligatorios'),
    body('apellidos').trim().notEmpty().withMessage('Apellidos obligatorios'),
    body('email').isEmail().withMessage('Email válido requerido'),
    body('dni').trim().notEmpty().withMessage('DNI obligatorio'),
    body('unidadId').notEmpty().withMessage('ID de unidad obligatorio'),
    body('fechaInicioContrato').isISO8601().withMessage('Fecha de inicio inválida (YYYY-MM-DD)'),
    body('fechaFinContrato').isISO8601().withMessage('Fecha de fin inválida (YYYY-MM-DD)'),
    body('telefono').optional().trim(),
    body('nacionalidad').optional().trim(),
    body('contactoEmergencia').optional().trim(),
    body('telefonoEmergencia').optional().trim(),
    body('tipoDocumento').optional().isIn(['DNI', 'CE', 'PASAPORTE'])
  ],

  /**
   * Validación para crear inquilino con usuario ya existente
   */
  createValidation: [
    body('usuarioId').notEmpty().withMessage('El ID del usuario inquilino es obligatorio'),
    body('unidadId').notEmpty().withMessage('El ID de la unidad es obligatorio'),
    body('fechaInicioContrato').isISO8601().withMessage('Fecha de inicio de contrato inválida (YYYY-MM-DD)'),
    body('fechaFinContrato').isISO8601().withMessage('Fecha de fin de contrato inválida (YYYY-MM-DD)'),
    body('nacionalidad').optional(),
    body('contactoEmergencia').optional(),
    body('telefonoEmergencia').optional()
  ],

  /**
   * FLUJO COMPLETO: Crear nuevo inquilino (Usuario + Inquilino)
   * El administrador ingresa los datos personales y el sistema crea automáticamente el usuario
   */
  async createCompleto(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Datos inválidos', 400, errors.array());
    }

    try {
      const resultado = await inquilinosService.createInquilinoCompleto(
        {
          nombres: req.body.nombres,
          apellidos: req.body.apellidos,
          email: req.body.email,
          dni: req.body.dni,
          telefono: req.body.telefono,
          nacionalidad: req.body.nacionalidad,
          contactoEmergencia: req.body.contactoEmergencia,
          telefonoEmergencia: req.body.telefonoEmergencia,
          tipoDocumento: req.body.tipoDocumento || 'DNI',
          // No generar contraseña aquí, dejar que el service la genere






          fechaInicioContrato: req.body.fechaInicioContrato,
          fechaFinContrato: req.body.fechaFinContrato

        },




        req.body.unidadId,
        req.user.edificioId,
        req.user.id
      );

      return success(
        res,
        resultado,
        'Inquilino registrado exitosamente. Usuario creado con rol INQUILINO'
      );
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Crear nuevo inquilino con usuario existente
   */
  async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Datos inválidos', 400, errors.array());
    }

    try {
      const inquilino = await inquilinosService.createInquilinoConUsuarioExistente(
        req.body.usuarioId,
        req.body.unidadId,
        {
          nacionalidad: req.body.nacionalidad,
          contactoEmergencia: req.body.contactoEmergencia,
          telefonoEmergencia: req.body.telefonoEmergencia,
          fechaInicioContrato: req.body.fechaInicioContrato,
          fechaFinContrato: req.body.fechaFinContrato
        },
        req.user.edificioId,
        req.user.id
      );
      return success(res, inquilino, 'Inquilino asignado a la unidad correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Listar todos los inquilinos del edificio
   */
  async listar(req, res) {
    try {
      // Usar edificiosIds o edificioId del usuario
      const edificioId = req.user.edificiosIds?.[0] || req.user.edificioId;
      if (!edificioId) {
        return error(res, 'No se encontró edificioId para el administrador', 400);
      }
      const inquilinos = await inquilinosService.listarInquilinos(edificioId);
      return success(res, inquilinos, 'Inquilinos listados correctamente');
    } catch (err) {
      return error(res, err.message);
    }
  },

  /**
   * Obtener detalles de un inquilino específico
   */
  async obtenerDetalles(req, res) {
    try {
      const { id } = req.params;
      const inquilino = await inquilinosService.obtenerInquilino(id);

      if (!inquilino) {
        return error(res, 'Inquilino no encontrado', 404);
      }

      return success(res, inquilino, 'Detalles del inquilino obtenidos');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Actualizar datos del inquilino
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const inquilino = await inquilinosService.updateInquilino(
        id,
        req.body,
        req.user.edificioId,
        req.user.id
      );
      return success(res, inquilino, 'Inquilino actualizado correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Finalizar contrato de inquilino
   */
  async finalizarContrato(req, res) {
    try {
      const { id } = req.params;
      const resultado = await inquilinosService.finalizarContrato(
        id,
        req.user.edificioId,
        req.user.id
      );
      return success(res, resultado, 'Contrato finalizado correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  }
};

module.exports = inquilinosController;