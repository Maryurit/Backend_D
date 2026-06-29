const metricasService = require("./metricas.service");
const { success, error } = require("../../shared/utils/response");

/**
 * Métricas Controller - Métricas avanzadas del sistema
 */
const metricasController = {

  /**
   * GET /api/metricas/generales
   * Obtener métricas generales del sistema
   */
  async obtenerMetricasGenerales(req, res) {
    try {
      const metricas = await metricasService.obtenerMetricasGenerales();

      return success(res, metricas, 'Métricas generales obtenidas correctamente');
    } catch (err) {
      console.error('Error obteniendo métricas generales:', err);
      return error(res, err.message, 500);
    }
  },

  /**
   * GET /api/metricas/seguridad/:edificioId
   * Obtener métricas de seguridad por edificio
   */
  async obtenerMetricasSeguridad(req, res) {
    try {
      const edificioId = req.params.edificioId;

      const metricas = await metricasService.obtenerMetricasSeguridad(edificioId);

      return success(res, metricas, 'Métricas de seguridad obtenidas correctamente');
    } catch (err) {
      console.error('Error obteniendo métricas de seguridad:', err);
      return error(res, err.message, 500);
    }
  },

  /**
   * GET /api/metricas/financieras/:edificioId
   * Obtener métricas financieras por edificio
   */
  async obtenerMetricasFinancieras(req, res) {
    try {
      const edificioId = req.params.edificioId;

      const metricas = await metricasService.obtenerMetricasFinancieras(edificioId);

      return success(res, metricas, 'Métricas financieras obtenidas correctamente');
    } catch (err) {
      console.error('Error obteniendo métricas financieras:', err);
      return error(res, err.message, 500);
    }
  },

  /**
   * GET /api/metricas/ocupacion/:edificioId
   * Obtener métricas de ocupación por edificio
   */
  async obtenerMetricasOcupacion(req, res) {
    try {
      const edificioId = req.params.edificioId;

      const metricas = await metricasService.obtenerMetricasOcupacion(edificioId);

      return success(res, metricas, 'Métricas de ocupación obtenidas correctamente');
    } catch (err) {
      console.error('Error obteniendo métricas de ocupación:', err);
      return error(res, err.message, 500);
    }
  },

  /**
   * GET /api/metricas/ia/:edificioId
   * Obtener métricas de rendimiento del sistema IA
   */
  async obtenerMetricasIA(req, res) {
    try {
      const edificioId = req.params.edificioId;

      const metricas = await metricasService.obtenerMetricasIA(edificioId);

      return success(res, metricas, 'Métricas IA obtenidas correctamente');
    } catch (err) {
      console.error('Error obteniendo métricas IA:', err);
      return error(res, err.message, 500);
    }
  },

  /**
   * GET /api/metricas/completas/:edificioId
   * Obtener todas las métricas de un edificio
   */
  async obtenerMetricasCompletas(req, res) {
    try {
      const edificioId = req.params.edificioId;

      const metricas = await metricasService.obtenerMetricasCompletas(edificioId);

      return success(res, metricas, 'Métricas completas obtenidas correctamente');
    } catch (err) {
      console.error('Error obteniendo métricas completas:', err);
      return error(res, err.message, 500);
    }
  }
};

module.exports = metricasController;