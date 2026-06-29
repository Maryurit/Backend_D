const prisma = require("../../shared/config/database");

/**
 * Vehiculos Repository - Respeta todos los campos de tu tabla "vehiculos"
 */
const vehiculosRepository = {

  /**
   * Registrar nuevo vehículo para un inquilino
   */
  async create(data, inquilinoId) {
    return await prisma.vehiculo.create({
      data: {
        inquilinoId,
        placa: data.placa.toUpperCase(),   // siempre en mayúsculas
        tipo: data.tipo || 'AUTO',
        modelo: data.modelo,
        color: data.color,
        activo: true
      },
      include: {
        inquilino: true
      }
    });
  },

  /**
   * Listar vehículos de un edificio (del administrador)
   */
  async findByEdificio(edificioId) {
    return await prisma.vehiculo.findMany({
      where: {
        inquilino: {
          unidad: {
            edificioId: edificioId
          }
        }
      },
      include: {
        inquilino: {
          include: {
            usuario: {
              select: { nombres: true, apellidos: true, email: true }
            }
          }
        }
      }
    });
  },

  /**
   * Actualizar vehículo
   */
  async update(id, data) {
    return await prisma.vehiculo.update({
      where: { id },
      data: {
        placa: data.placa ? data.placa.toUpperCase() : undefined,
        tipo: data.tipo,
        modelo: data.modelo,
        color: data.color,
        activo: data.activo
      }
    });
  },

  /**
   * Activar / Desactivar vehículo
   */
  async toggleActivo(id) {
    const vehiculo = await prisma.vehiculo.findUnique({ where: { id } });
    return await prisma.vehiculo.update({
      where: { id },
      data: { activo: !vehiculo.activo }
    });
  },

  /**
   * Buscar vehículo por ID incluyendo edificio asociado y usuario del inquilino
   */
  async findById(id) {
    return await prisma.vehiculo.findUnique({
      where: { id },
      include: {
        inquilino: {
          include: {
            usuario: {
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                email: true,
                dni: true,
                telefono: true
              }
            },
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
   * Buscar vehículo por placa para evitar duplicados
   */
  async findByPlaca(placa) {
    return await prisma.vehiculo.findFirst({
      where: { placa: placa.toUpperCase() }
    });
  },

  /**
   * Listar vehículos de un inquilino dentro del edificio del administrador
   */
  async findByInquilino(inquilinoId, edificioId) {
    return await prisma.vehiculo.findMany({
      where: {
        inquilinoId,
        inquilino: {
          unidad: {
            edificioId
          }
        }
      },
      include: {
        inquilino: {
          include: {
            usuario: {
              select: { nombres: true, apellidos: true, email: true }
            }
          }
        }
      }
    });
  },

  /**
   * Eliminar vehículo permanentemente
   */
  async delete(id) {
    return await prisma.vehiculo.delete({
      where: { id }
    });
  }
};

module.exports = vehiculosRepository;