const auditoriaRepository = require("./auditoria.repository");

const auditoriaService = {

  /**
   * Obtener auditoría con filtros
   */
  async getAuditoria(filters = {}) {
    return await auditoriaRepository.find({
      usuarioId: filters.usuarioId,
      edificioId: filters.edificioId,
      desde: filters.desde,
      hasta: filters.hasta
    });
  },

  /**
   * Obtener auditoría de un usuario específico
   */
  async getAuditoriaByUsuario(usuarioId, filters = {}) {
    return await auditoriaRepository.find({
      usuarioId,
      edificioId: filters.edificioId,
      desde: filters.desde,
      hasta: filters.hasta
    });
  },

  /**
   * Obtener estadísticas para HistorialTimeline
   */
  async getAuditoriaStats(usuarioId) {
    const auditoria = await auditoriaRepository.find({
      usuarioId
    });

    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const ultimoMes = auditoria.filter(item =>
      new Date(item.fecha) >= hace30Dias
    );

    const porEdificio = {};

    auditoria.forEach(item => {
      if (item.edificio?.id) {
        porEdificio[item.edificio.id] =
          (porEdificio[item.edificio.id] || 0) + 1;
      }
    });

    return {
      total: auditoria.length,
      ultimoMes: ultimoMes.length,
      porEdificio
    };
  },

  /**
   * Registrar actividad
   */
  async create(data) {
    return await auditoriaRepository.create(
      data.usuarioId || null,
      data.edificioId || null,
      data.accion,
      data.descripcion
    );
  }
};

module.exports = auditoriaService;