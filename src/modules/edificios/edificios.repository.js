const prisma = require("../../shared/config/database");
const suscripcionUtil = require('../../shared/utils/suscripcion.util');

/**
 * Edificios Repository - Respeta todos los campos de tu tabla edificios
 */
const edificiosRepository = {

  /**
   * Crea un nuevo edificio + suscripción automática con Plan GRATUITO
   */
  async create(data, propietarioId, planGratuitoId) {
    return await prisma.edificio.create({
      data: {
        propietarioId,
        nombre: data.nombre,
        direccion: data.direccion || null,
        ciudad: data.ciudad || null,
        provincia: data.provincia || null,
        distrito: data.distrito || null,
        activo: true,
        // Suscripción automática con Plan GRATUITO
        suscripcion: {
          create: {
            planId: planGratuitoId,
            fechaInicio: new Date(),
            fechaFin: suscripcionUtil.calcularProximoVencimiento(),
            diasGracia: suscripcionUtil.DIAS_GRACIA_SUSCRIPCION,
            activa: true
          }
        }
      },
      include: {
        suscripcion: {
          include: {
            plan: true
          }
        }
      }
    });
  },

  /**
   * Obtiene todos los edificios de un propietario
   */
  async findByPropietarioId(propietarioId) {
    return await prisma.edificio.findMany({
      where: { propietarioId },
      include: {
        suscripcion: {
          include: { plan: true }
        },
        administradores: {
          include: {
            usuario: true
          }
        }
      }
    });
  },

  /**
   * Obtiene un edificio por ID
   */
  async findById(id) {
    return await prisma.edificio.findUnique({
      where: { id },
      include: {
        suscripcion: {
          include: { plan: true }
        },
        administradores: {
          include: {
            usuario: true
          }
        }
      }
    });
  },

    /**
   * Actualizar un edificio (solo Propietario)
   */
  async update(id, data, propietarioId) {
    const edificio = await this.findById(id);
    if (!edificio || edificio.propietarioId !== propietarioId) {
      throw new Error('No tienes permiso para modificar este edificio');
    }

    return await prisma.edificio.update({
      where: { id },
      data: {
        nombre: data.nombre,
        direccion: data.direccion,
        ciudad: data.ciudad,
        provincia: data.provincia,
        distrito: data.distrito,
        activo: data.activo !== undefined ? data.activo : undefined
      },
      include: {
        suscripcion: { include: { plan: true } }
      }
    });
  },

  /**
   * Eliminar edificio (soft delete - cambia activo a false)
   */
  async delete(id, propietarioId) {
    const edificio = await this.findById(id);
    if (!edificio || edificio.propietarioId !== propietarioId) {
      throw new Error('No tienes permiso para eliminar este edificio');
    }

    return await prisma.edificio.update({
      where: { id },
      data: { activo: false }
    });
  }
};

module.exports = edificiosRepository;
