const auditoriaService = require("./auditoria.service");
const { success, error } = require("../../shared/utils/response");

const auditoriaController = {

  /**
   * GET /api/auditoria
   * GET /api/auditoria?usuarioId=xxx
   * GET /api/auditoria?edificioId=xxx
   */
  async getAuditoria(req, res) {
    try {
      const { usuarioId, edificioId } = req.query;

      const data = await auditoriaService.getAuditoria({
        usuarioId,
        edificioId
      });

      return success(res, data, "Auditoría obtenida");
    } catch (err) {
      return error(res, err.message);
    }
  },

  /**
   * GET /api/auditoria/usuario/:usuarioId
   */
  async getAuditoriaByUsuario(req, res) {
    try {
      const { usuarioId } = req.params;
      const { edificioId } = req.query;

      const data = await auditoriaService.getAuditoria({
        usuarioId,
        edificioId
      });

      return success(res, data, "Auditoría del usuario obtenida");
    } catch (err) {
      return error(res, err.message);
    }
  },

  /**
   * GET /api/auditoria/usuario/:usuarioId/stats
   */
  async getAuditoriaStats(req, res) {
    try {
      const { usuarioId } = req.params;

      const auditoria = await auditoriaService.getAuditoria({
        usuarioId
      });

      const ultimoMes = auditoria.filter(item => {
        const fecha = new Date(item.fecha);
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);

        return fecha >= hace30Dias;
      });

      const porEdificio = {};

      auditoria.forEach(item => {
        if (item.edificio) {
          porEdificio[item.edificio.id] =
            (porEdificio[item.edificio.id] || 0) + 1;
        }
      });

      return success(
        res,
        {
          total: auditoria.length,
          ultimoMes: ultimoMes.length,
          porEdificio
        },
        "Estadísticas obtenidas"
      );
    } catch (err) {
      return error(res, err.message);
    }
  }
};

module.exports = auditoriaController;