const prisma = require('../../shared/config/database');

/**
 * Usuarios Repository - Respeta TODOS los campos de tu tabla usuarios
 */
const usuariosRepository = {

  /**
   * Crea un nuevo usuario con todos los campos posibles de tu BD
   */
  async create(data) {
    return await prisma.usuario.create({
      data: {
        rolId: data.rolId,
        nombres: data.nombres,
        apellidos: data.apellidos,
        tipoDocumento: data.tipoDocumento || 'DNI',
        dni: data.dni || null,
        email: data.email,
        passwordHash: data.passwordHash,
        telefono: data.telefono || null,
        direccion: data.direccion || null,
        activo: true
      },
      include: {
        rol: true
      }
    });
  },

  /**
   * Busca usuario por ID
   */
  async findById(id) {
    return await prisma.usuario.findUnique({
      where: { id },
      include: {
        rol: true,
        administradores: true,
        edificios: true
      }
    });
  },

  /**
   * Crea un usuario con rol ADMINISTRADOR (usado por el Propietario)
   */
  async createAdmin(data) {
    return await prisma.usuario.create({
      data: {
        rolId: data.rolId,
        nombres: data.nombres,
        apellidos: data.apellidos,
        tipoDocumento: data.tipoDocumento || 'DNI',
        dni: data.dni || null,
        email: data.email,
        passwordHash: data.passwordHash,
        telefono: data.telefono || null,
        direccion: data.direccion || null,
        activo: true
      },
      include: {
        rol: true
      }
    });
  },

  /**
   * Busca usuario por email (para verificar si ya existe antes de crear admin)
   */
  async findByEmail(email) {
    return await prisma.usuario.findUnique({
      where: { email },
      include: {
        rol: true,
        administradores: {
          where: { activo: true }
        }
      }
    });
  },

  /**
   * Busca usuario por email con todas las relaciones necesarias para el login
   */
  async findByEmailWithRelations(email) {
    return await prisma.usuario.findUnique({
      where: { email },
      include: {
        rol: true,
        administradores: {
          where: { activo: true },
          include: {
            edificio: true
          }
        },
        edificios: true,
        inquilino: {
          include: {
            unidad: {
              include: {
                edificio: true
              }
            }
          }
        }
      }
    });
  },

  /**
   * Actualizar Admin
   */
  async update(id, data) {
    return await prisma.usuario.update({
      where: { id },
      data: {
        nombres: data.nombres,
        apellidos: data.apellidos,
        email: data.email,
        dni: data.dni,
        telefono: data.telefono,
        direccion: data.direccion,
        activo: data.activo
      }
    });
  },

  async delete(id) {
    return await prisma.usuario.delete({
      where: { id }
    });
  },

  /**
   * Listar usuarios por rol
   */
  async findByRol(nombreRol) {
    return await prisma.usuario.findMany({
      where: {
        rol: {
          nombre: nombreRol
        }
      },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        email: true,
        dni: true,
        telefono: true,
        activo: true,
        fechaCreacion: true
      },
      orderBy: { fechaCreacion: 'desc' }
    });
  },

  /**
   * Buscar usuario por DNI (para validar unicidad)
   */
  async findByDni(dni) {
    return await prisma.usuario.findUnique({
      where: { dni },
      include: {
        rol: true
      }
    });
  }
};

module.exports = usuariosRepository;
