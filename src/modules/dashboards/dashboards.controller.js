const dashboardService = require("./dashboards.service");
const { success, error } = require("../../shared/utils/response");

/**
 * Dashboard Controller - Endpoints para métricas e indicadores
 */
const dashboardController = {

  /**
   * GET /api/dashboard/propietario
   * Dashboard general del propietario
   */
  async getDashboardPropietario(req, res) {
    try {
      const propietarioId = req.user.id;
      const dashboard = await dashboardService.getDashboardPropietario(propietarioId);

      return success(res, dashboard, 'Dashboard del propietario cargado correctamente');
    } catch (err) {
      console.error('Error en dashboard propietario:', err);
      return error(res, err.message, 500);
    }
  },

async getDashboardInquilino(req, res) {
  try {
    const usuarioId = req.user.id;

    const dashboard = await dashboardService.getDashboardInquilino(usuarioId);

    return success(res, dashboard, 'Dashboard inquilino cargado correctamente');
  } catch (err) {
    return error(res, err.message, 500);
  }
},




  /**
   * GET /api/dashboard/administrador/:edificioId
   * Dashboard del administrador para un edificio específico
   */
  async getDashboardAdministrador(req, res) {
    try {
      const administradorId = req.user.id;
      const edificioId = req.params.edificioId;

      if (!edificioId) {
        return error(res, 'ID de edificio requerido', 400);
      }

      const dashboard = await dashboardService.getDashboardAdministrador(administradorId, edificioId);

      return success(res, dashboard, 'Dashboard del administrador cargado correctamente');
    } catch (err) {
      console.error('Error en dashboard administrador:', err);
      return error(res, err.message, 500);
    }
  }
};

module.exports = dashboardController;