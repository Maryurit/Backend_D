const unidadesRepository = require("./unidades.repository");
const auditoriaRepository = require("../auditoria/auditoria.repository");
const planLimitsUtil = require("../../shared/utils/planLimits.util");

/**
 * Unidades Service - Soporta creación individual y por rango
 */
const unidadesService = {

  /**
   * Crear una o múltiples unidades
   * Soporta creación individual o por rango (ej: 101-105)
   */
  async createUnidades(data, edificioId, adminId) {
    if (!edificioId) {
      throw new Error('El ID del edificio es obligatorio');
    }

    // Validar tope de unidades según plan SaaS del edificio (maxUnidades en tabla Plan)
    const cantidadNueva = Array.isArray(data) ? data.length : 1;
    await planLimitsUtil.validarCreacionUnidades(edificioId, cantidadNueva);

    const unidadesCreadas = [];

    // Si se envía un array → creación múltiple
    if (Array.isArray(data)) {
      for (const item of data) {
        const unidad = await unidadesRepository.create(item, edificioId);
        unidadesCreadas.push(unidad);

        await auditoriaRepository.create(
          adminId,
          edificioId,
          'CREAR_UNIDAD',
          `Se creó la unidad ${item.numero}`
        );
      }
    }
    // Creación individual
    else {
      const unidad = await unidadesRepository.create(data, edificioId);
      unidadesCreadas.push(unidad);

      await auditoriaRepository.create(
        adminId,
        edificioId,
        'CREAR_UNIDAD',
        `Se creó la unidad ${data.numero}`
      );
    }

    return unidadesCreadas;
  },

  /**
   * Listar unidades del edificio
   */
  async listarUnidades(edificioId) {
    if (!edificioId) throw new Error('El ID del edificio es obligatorio');
    return await unidadesRepository.findByEdificio(edificioId);
  },

  async updateUnidad(id, data, edificioId, adminId) {
    const unidad = await unidadesRepository.update(id, data);
    await auditoriaRepository.create(adminId, edificioId, 'ACTUALIZAR_UNIDAD', `Unidad ${unidad.numero} actualizada`);
    return unidad;
  },

  async deleteUnidad(id, edificioId, adminId) {
    const unidad = await unidadesRepository.delete(id);
    await auditoriaRepository.create(adminId, edificioId, 'ELIMINAR_UNIDAD', `Unidad desactivada`);
    return unidad;
  },






  /**
   * Listar unidades disponibles del edificio
   */
  async listarUnidadesDisponibles(edificioId) {
    if (!edificioId) {
      throw new Error('El ID del edificio es obligatorio');
    }

    return await unidadesRepository.findDisponiblesByEdificio(edificioId);
  },





  /**
 * Crear unidades por rango (ej: del 101 al 105)
 */
  async createUnidadesPorRango(desde, hasta, piso, capacidadMaxima, edificioId, adminId) {
    if (!desde || !hasta || desde > hasta) {
      throw new Error('Rango inválido: "desde" debe ser menor o igual a "hasta"');
    }

    const unidadesCreadas = [];

    for (let num = desde; num <= hasta; num++) {
      const data = {
        numero: num.toString().padStart(3, '0'), // "101", "102", etc.
        piso: piso,
        capacidadMaxima: capacidadMaxima || 2
      };

      const unidad = await unidadesRepository.create(data, edificioId);
      unidadesCreadas.push(unidad);

      await auditoriaRepository.create(
        adminId,
        edificioId,
        'CREAR_UNIDAD',
        `Se creó la unidad ${data.numero} por rango`
      );
    }

    return unidadesCreadas;
  },
};

module.exports = unidadesService;
