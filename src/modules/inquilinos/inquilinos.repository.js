const prisma = require("../../shared/config/database");

/**
 * Inquilinos Repository
 * Respeta todos los campos exactos de tu tabla "inquilinos"
 */
const inquilinosRepository = {

  /**
   * Crear nuevo inquilino vinculado a un usuario y una unidad
   */
  async create(data, unidadId) {
    return await prisma.inquilino.create({
      data: {
        usuarioId: data.usuarioId,
        unidadId: unidadId,
        nacionalidad: data.nacionalidad || null,
        contactoEmergencia: data.contactoEmergencia || null,
        telefonoEmergencia: data.telefonoEmergencia || null,
        fechaInicioContrato: new Date(data.fechaInicioContrato),
        fechaFinContrato: new Date(data.fechaFinContrato),
        estadoContrato: 'ACTIVO'
      },
      include: {
        usuario: {
          select: { id: true, nombres: true, apellidos: true, email: true, dni: true }
        },
        unidad: true
      }
    });
  },

  /**
   * Listar inquilinos del edificio del administrador
   */
  async findByEdificio(edificioId) {
    return await prisma.inquilino.findMany({
      where: {
        unidad: {
          edificioId: edificioId
        }
      },
      include: {
        usuario: {
          select: { id: true, nombres: true, apellidos: true, email: true, dni: true, telefono: true }
        },
        unidad: true
      },
      orderBy: { fechaRegistro: 'desc' }
    });
  },

  /**
   * Actualizar datos del inquilino
   */
  async update(id, data) {
    return await prisma.inquilino.update({
      where: { id },
      data: {
        nacionalidad: data.nacionalidad,
        contactoEmergencia: data.contactoEmergencia,
        telefonoEmergencia: data.telefonoEmergencia,
        fechaInicioContrato: data.fechaInicioContrato ? new Date(data.fechaInicioContrato) : undefined,
        fechaFinContrato: data.fechaFinContrato ? new Date(data.fechaFinContrato) : undefined,
        estadoContrato: data.estadoContrato
      }
    });
  },

  /**
   * Finalizar contrato de inquilino
   */
  async finalizarContrato(id) {
    return await prisma.inquilino.update({
      where: { id },
      data: { 
        estadoContrato: 'FINALIZADO',
        fechaFinContrato: new Date()
      }
    });
  },

  /**
   * Verificar si una unidad está disponible (sin inquilino asignado)
   */
  async isUnidadDisponible(unidadId) {
    const unidad = await prisma.unidad.findUnique({
      where: { id: unidadId },
      include: {
        inquilino: true
      }
    });

    if (!unidad) {
      throw new Error('La unidad no existe');
    }

    if (!unidad.activa) {
      throw new Error('La unidad no está activa');
    }

    if (unidad.inquilino) {
      throw new Error('La unidad ya tiene un inquilino asignado');
    }

    return true;
  },

  /**
   * Buscar inquilino por ID
   */
  async findById(id) {
    return await prisma.inquilino.findUnique({
      where: { id },
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
    });
  },

  /**
   * Buscar inquilino por usuario ID
   */
  async findByUsuarioId(usuarioId) {
    return await prisma.inquilino.findUnique({
      where: { usuarioId },
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
        unidad: true
      }
    });
  }
};
module.exports = inquilinosRepository;