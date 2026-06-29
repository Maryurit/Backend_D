const prisma = require("../../shared/config/database");

/**
 * Administradores Repository
 */
const administradoresRepository = {

  /**
   * Asigna un usuario como administrador de un edificio
   */
  async assignAdmin(usuarioId, edificioId) {
    return await prisma.administrador.create({
      data: {
        usuarioId,
        edificioId,
        activo: true
      },
      include: {
        usuario: {
          select: { id: true, nombres: true, apellidos: true, email: true }
        },
        edificio: {
          select: { id: true, nombre: true }
        }
      }
    });
  },

  /**
   * Lista todos los administradores de un edificio
   */
  async findByEdificioId(edificioId) {
    return await prisma.administrador.findMany({
      where: { edificioId },
      include: {
        usuario: {
          select: { id: true, nombres: true, apellidos: true, email: true }
        }
      }
    });
  },

    /**
   * Actualizar administrador (activar/desactivar)
   */
  async update(id, data) {
    return await prisma.administrador.update({
      where: { id },
      data: {
        activo: data.activo
      },
      include: {
        usuario: true,
        edificio: true
      }
    });
  },

  /**
   * Eliminar asignación de administrador (hard delete)
   */
  async delete(id) {
    return await prisma.administrador.delete({
      where: { id }
    });
  }
};

module.exports = administradoresRepository;
