const prisma = require("../../shared/config/database");

/**
 * Cámaras Repository
 */
const camarasRepository = {

  /**
   * Registrar nueva cámara en el edificio
   */

  async create(data, edificioId) {
    if (!edificioId) {
      throw new Error("El ID del edificio es obligatorio para registrar una cámara");
    }

    return await prisma.camara.create({
      data: {
        nombre: data.nombre,
        ubicacion: data.ubicacion,
        urlStream: data.urlStream,
        activa: data.activa !== undefined ? data.activa : true,
        // === CONEXIÓN CORRECTA CON EL EDIFICIO ===
        edificio: {
          connect: { id: edificioId }
        }
      },
      include: {
        edificio: true
      }
    });
  },
  /**
   * Listar cámaras del edificio
   */
  async findByEdificio(edificioId) {
    return await prisma.camara.findMany({
      where: { edificioId, activa: true }
    });
  },

  async findByEdificios(edificiosIds) {
    return await prisma.camara.findMany({
      where: { edificioId: { in: edificiosIds }, activa: true }
    });
  },
  /**
   * Camaras activas del sistema (para el servicio IA)
   */
  async getCamarasActivas() {
    return await prisma.camara.findMany({
      where: { 
        activa: true 
      },
      select: {
        id: true,
        nombre: true,
        urlStream: true,
        ubicacion: true,
        edificioId: true,
        activa: true
      }
    });
  },

  // camaras.repository.js

  async getById(id, edificioId) {
    return await prisma.camara.findFirst({
      where: { 
        id,
        edificioId,
        activa: true 
      }
    });
  },

  async getByIdAndEdificios(id, edificioIds) {
    return await prisma.camara.findFirst({
      where: {
        id,
        edificioId: { in: edificioIds },
        activa: true
      }
    });
  },

  async update(id, data, edificioId) {
    return await prisma.camara.update({
      where: { 
        id,
        edificioId 
      },
      data: {
        nombre: data.nombre,
        ubicacion: data.ubicacion,
        urlStream: data.urlStream,
        activa: data.activa
      }
    });
  },

  async delete(id, edificioId) {
    // Soft delete
    return await prisma.camara.update({
      where: { 
        id,
        edificioId 
      },
      data: { activa: false }
    });
  }
};

module.exports = camarasRepository;