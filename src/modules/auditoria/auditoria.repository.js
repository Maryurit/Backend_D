const prisma = require("../../shared/config/database");

/**
 * Auditoría Repository
 */
const auditoriaRepository = {

  /**
   * Registrar auditoría
   */
  async create(usuarioId, edificioId, accion, descripcion) {
    return await prisma.auditoria.create({
      data: {
        usuarioId: usuarioId || null,
        edificioId: edificioId || null,
        accion,
        descripcion
      }
    });
  },

  /**
   * Historial por edificio
   */
  async findByEdificio(edificioId) {
    return await prisma.auditoria.findMany({
      where: { edificioId },
      include: {
        usuario: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            email: true
          }
        },
        edificio: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        fecha: "desc"
      }
    });
  },

  /**
   * Historial por usuario
   */
  async findByUsuario(usuarioId) {
    return await prisma.auditoria.findMany({
      where: { usuarioId },
      include: {
        usuario: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            email: true
          }
        },
        edificio: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        fecha: "desc"
      }
    });
  },

  /**
   * Método principal para filtros
   *
   * Soporta:
   * - usuarioId
   * - edificioId
   * - desde
   * - hasta
   */
  async find(filters = {}) {
    const where = {};

    if (filters.usuarioId) {
      where.usuarioId = filters.usuarioId;
    }

    if (filters.edificioId) {
      where.edificioId = filters.edificioId;
    }

    if (filters.desde || filters.hasta) {
      where.fecha = {};

      if (filters.desde) {
        where.fecha.gte = new Date(filters.desde);
      }

      if (filters.hasta) {
        where.fecha.lte = new Date(filters.hasta);
      }
    }

    return await prisma.auditoria.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            email: true
          }
        },
        edificio: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        fecha: "desc"
      }
    });
  },

  /**
   * Accesos por edificios
   */
  async findAccesosByEdificios(edificioIds) {
    return await prisma.historialAcceso.findMany({
      where: {
        edificioId: {
          in: edificioIds
        }
      },
      include: {
        vehiculo: true,
        camara: true,
        alerta: true
      },
      orderBy: {
        fechaEvento: "desc"
      }
    });
  },

  /**
   * Alertas por edificios
   */
  async findAlertasByEdificios(edificioIds) {
    return await prisma.alerta.findMany({
      where: {
        edificioId: {
          in: edificioIds
        }
      },
      include: {
        historial: true
      },
      orderBy: {
        fechaCreacion: "desc"
      }
    });
  }
};

module.exports = auditoriaRepository;