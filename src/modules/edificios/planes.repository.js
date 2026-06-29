const prisma = require("../../shared/config/database");

/**
 * Planes Repository
 * Maneja operaciones relacionadas con los planes de suscripción
 */
const planesRepository = {

  /**
   * Buscar plan por nombre
   */
  async findByName(nombre) {
    return await prisma.plan.findUnique({
      where: { nombre }
    });
  },

  /**
   * Listar todos los planes
   */
  async findAll() {
    return await prisma.plan.findMany({
      orderBy: { precio: 'asc' }
    });
  }
};

module.exports = planesRepository;
