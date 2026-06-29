const prisma = require("../../shared/config/database");

/**
 * Unidades Repository
 * Maneja todas las operaciones CRUD de unidades respetando tu tabla exacta
 */
const unidadesRepository = {

  /**
   * Crear una nueva unidad en un edificio
   */
  async create(data, edificioId) {
    return await prisma.unidad.create({
      data: {
        edificioId: edificioId,                    // Relación correcta
        numero: data.numero,
        piso: data.piso,
        capacidadMaxima: data.capacidadMaxima || 2,
        activa: true
      },
      include: {
        inquilino: true
      }
    });
  },

  /**
   * Listar todas las unidades de un edificio
   */
  async findByEdificio(edificioId) {
    return await prisma.unidad.findMany({
      where: { edificioId },
      include: {
        inquilino: {
          include: {
            usuario: {
              select: { nombres: true, apellidos: true, email: true }
            }
          }
        }
      },
      orderBy: { numero: 'asc' }
    });
  },



  /**
   * Listar únicamente unidades disponibles
   * (activas y sin inquilino asignado)
   */
  async findDisponiblesByEdificio(edificioId) {
    return await prisma.unidad.findMany({
      where: {
        edificioId,
        activa: true,
        inquilino: null
      },
      orderBy: [
        { piso: 'asc' },
        { numero: 'asc' }
      ]
    });
  },



  /**
   * Actualizar unidad
   */
  async update(id, data) {
    return await prisma.unidad.update({
      where: { id },
      data: {
        numero: data.numero,
        piso: data.piso,
        capacidadMaxima: data.capacidadMaxima,
        activa: data.activa !== undefined ? data.activa : undefined
      }
    });
  },

  /**
   * Soft delete de unidad (cambia activo a false)
   */
  async delete(id) {
    return await prisma.unidad.update({
      where: { id },
      data: { activa: false }
    });
  }
};

module.exports = unidadesRepository;