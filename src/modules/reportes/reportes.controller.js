const reportesService = require("./reportes.service");
const { success, error } = require("../../shared/utils/response");

/**
 * Reportes Controller - Generación de reportes en PDF
 */
const reportesController = {

  /**
   * GET /api/reportes/accesos/:edificioId
   * Generar reporte de accesos en PDF
   */
  async generarReporteAccesos(req, res) {
    try {
      const edificioId = req.params.edificioId;
      const { fechaDesde, fechaHasta } = req.query;

      if (!fechaDesde || !fechaHasta) {
        return error(res, 'Las fechas desde y hasta son requeridas', 400);
      }

      const pdf = await reportesService.generarReporteAccesos(edificioId, fechaDesde, fechaHasta);

      res.setHeader('Content-Type', pdf.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);

      return res.send(pdf.buffer);
    } catch (err) {
      console.error('Error generando reporte de accesos:', err);
      return error(res, err.message, 500);
    }
  },

  /**
   * GET /api/reportes/inquilinos/:edificioId
   * Generar reporte de inquilinos en PDF
   */
  async generarReporteInquilinos(req, res) {
    try {
      const edificioId = req.params.edificioId;

      const pdf = await reportesService.generarReporteInquilinos(edificioId);

      res.setHeader('Content-Type', pdf.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);

      return res.send(pdf.buffer);
    } catch (err) {
      console.error('Error generando reporte de inquilinos:', err);
      return error(res, err.message, 500);
    }
  },

  /**
   * GET /api/reportes/financiero/:edificioId
   * Generar reporte financiero en PDF
   */
  async generarReporteFinanciero(req, res) {
    try {
      const edificioId = req.params.edificioId;
      const { fechaDesde, fechaHasta } = req.query;

      if (!fechaDesde || !fechaHasta) {
        return error(res, 'Las fechas desde y hasta son requeridas', 400);
      }

      const pdf = await reportesService.generarReporteFinanciero(edificioId, fechaDesde, fechaHasta);

      res.setHeader('Content-Type', pdf.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);

      return res.send(pdf.buffer);
    } catch (err) {
      console.error('Error generando reporte financiero:', err);
      return error(res, err.message, 500);
    }
  }
};

module.exports = reportesController;