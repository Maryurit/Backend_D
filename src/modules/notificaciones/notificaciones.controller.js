const notificacionesService = require("./notificaciones.service");
const { success, error } = require("../../shared/utils/response");

/**
 * Notificaciones Controller - Gestión de notificaciones y recordatorios
 */
const notificacionesController = {

  /**
   * GET /api/notificaciones
   * Obtener notificaciones del usuario autenticado
   */
  async obtenerNotificaciones(req, res) {
    try {
      const usuarioId = req.user.id;
      const soloNoLeidas = req.query.leidas === 'false';

      const notificaciones = await notificacionesService.obtenerNotificacionesUsuario(
        usuarioId,
        soloNoLeidas
      );

      return success(res, notificaciones, 'Notificaciones obtenidas correctamente');
    } catch (err) {
      console.error('Error obteniendo notificaciones:', err);
      return error(res, err.message, 500);
    }
  },

  /**
   * PUT /api/notificaciones/:id/leida
   * Marcar notificación como leída
   */
  async marcarComoLeida(req, res) {
    try {
      const notificacionId = req.params.id;
      const usuarioId = req.user.id;

      const actualizado = await notificacionesService.marcarComoLeida(notificacionId, usuarioId);

      if (!actualizado) {
        return error(res, 'Notificación no encontrada o no tienes permisos', 404);
      }

      return success(res, null, 'Notificación marcada como leída');
    } catch (err) {
      console.error('Error marcando notificación como leída:', err);
      return error(res, err.message, 500);
    }
  },

  /**
   * POST /api/notificaciones/mantenimiento
   * Ejecutar mantenimiento de notificaciones (solo admin/propietario)
   */
  async ejecutarMantenimiento(req, res) {
    try {
      // Solo administradores y propietarios pueden ejecutar mantenimiento
      if (!['ADMINISTRADOR', 'PROPIETARIO'].includes(req.user.rol)) {
        return error(res, 'No tienes permisos para ejecutar esta acción', 403);
      }

      const resultados = await notificacionesService.ejecutarMantenimientoNotificaciones();

      return success(res, resultados, 'Mantenimiento de notificaciones ejecutado correctamente');
    } catch (err) {
      console.error('Error ejecutando mantenimiento:', err);
      return error(res, err.message, 500);
    }
  }
};

module.exports = notificacionesController;