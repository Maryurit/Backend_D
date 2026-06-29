const prisma = require('../config/database');

/**
 * Repositorio para manejar operaciones con la tabla roles
 */
const rolesRepository = {
  
  /**
   * Obtiene un rol por su nombre (PROPIETARIO, ADMINISTRADOR, etc.)
   */
  async findByName(nombre) {
    return await prisma.rol.findUnique({
      where: { nombre }
    });
  },

  /**
   * Obtiene todos los roles (útil para debugging)
   */
  async findAll() {
    return await prisma.rol.findMany();
  }
};

module.exports = rolesRepository;