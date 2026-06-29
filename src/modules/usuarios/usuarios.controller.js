const usuariosService = require("./usuarios.service");
const { success, error } = require("../../shared/utils/response");
const { body, validationResult } = require('express-validator');

/**
 * Usuarios Controller - Gestión de Administradores (solo Propietario)
 */
const usuariosController = {

  createAdminValidation: [
    body('nombres').notEmpty().withMessage('Nombres son obligatorios'),
    body('apellidos').notEmpty().withMessage('Apellidos son obligatorios'),
    body('email').isEmail().withMessage('Email válido requerido'),
    body('password').isLength({ min: 6 }).withMessage('Contraseña mínimo 6 caracteres'),
    body('dni').optional(),
    body('telefono').optional(),
    body('tipoDocumento').optional().isIn(['DNI', 'CE', 'PASAPORTE'])
  ],

  /**
   * Crear nuevo Administrador (solo Propietario)
   */
  async createAdmin(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Datos inválidos', 400, errors.array());
    }

    try {
      const admin = await usuariosService.createAdmin(req.body);
      return success(res, admin, 'Administrador creado correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

    /**
   * Listar todos los administradores (solo Propietario)
   */
  async listarAdministradores(req, res) {
    try {
      const admins = await usuariosService.listarAdministradores();
      return success(res, admins, 'Administradores listados correctamente');
    } catch (err) {
      return error(res, err.message);
    }
  },

    /**
   * Actualizar administrador (activar/desactivar)
   */
  async updateAdmin(req, res) {
    try {
      const { id } = req.params;
      const resultado = await usuariosService.updateAdmin(id, req.body);
      return success(res, resultado, 'Administrador actualizado');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /**
   * Eliminar administrador
   */
  async deleteAdmin(req, res) {
    try {
      const { id } = req.params;
      await usuariosService.deleteAdmin(id);
      return success(res, null, 'Administrador eliminado');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

    /**
   * Crear usuario con rol INQUILINO (desde Administrador)
   */
  async createInquilinoUsuario(req, res) {
    try {
      const usuario = await usuariosService.createInquilinoUsuario(req.body);
      return success(res, usuario, 'Usuario Inquilino creado correctamente');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

    /**
   * Listar usuarios con rol INQUILINO (solo Administrador)
   * Útil para obtener el usuarioId antes de crear el inquilino
   */
  async listarUsuariosInquilinos(req, res) {
    try {
      const prisma = require('../../shared/config/database');
      
      const usuariosInquilinos = await prisma.usuario.findMany({
        where: {
          rol: {
            nombre: 'INQUILINO'
          }
        },
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          email: true,
          dni: true,
          telefono: true,
          fechaCreacion: true
        },
        orderBy: { fechaCreacion: 'desc' }
      });

      return success(res, usuariosInquilinos, 'Usuarios Inquilinos listados correctamente');
    } catch (err) {
      return error(res, err.message);
    }
  }
};

module.exports = usuariosController;