const camarasRepository = require('./camaras.repository');
const auditoriaRepository = require('../auditoria/auditoria.repository');

/**
 * Cámaras Service
 */
const camarasService = {

  /** * Registrar nueva cámara */ 
  async registrarCamara(data, edificioId, usuarioId) { 
    return await camarasRepository.create(data, edificioId); 
  },

  /** * Listar cámaras del edificio */ 
  async listarCamaras(edificioIdOrIds) {
    if (Array.isArray(edificioIdOrIds)) {
      return await camarasRepository.findByEdificios(edificioIdOrIds);
    }
    return await camarasRepository.findByEdificio(edificioIdOrIds);
  },

  /** * Obtener cámara por ID (del edificio del admin o propietario) */ 
  async getById(id, edificioIdOrIds) {
    if (Array.isArray(edificioIdOrIds)) {
      return await camarasRepository.getByIdAndEdificios(id, edificioIdOrIds);
    }
    return await camarasRepository.getById(id, edificioIdOrIds);
  },

  /** * Actualizar cámara */ 
  async actualizarCamara(id, data, edificioId) { 
    return await camarasRepository.update(id, data, edificioId); 
  },

  /** * Eliminar cámara (Soft Delete) */ 
  async eliminarCamara(id, edificioId) { 
    return await camarasRepository.delete(id, edificioId); 
  },

  /**
   * Obtener todas las cámaras activas (para el servicio IA)
   * Este método ya lo tienes en el repository
   */
  async getCamarasActivas() {
    return await camarasRepository.getCamarasActivas();
  }
};

module.exports = camarasService;