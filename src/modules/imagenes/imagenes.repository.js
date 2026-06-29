const prisma = require("../../shared/config/database");
const fs = require('fs').promises;
const path = require('path');

/**
 * Imágenes Repository
 * Gestiona el almacenamiento y recuperación de imágenes
 */
const imagenesRepository = {

  /**
   * Guardar nueva imagen en BD
   */
  async create(data) {
    return await prisma.imagen.create({
      data: {
        camaraId: data.camaraId,
        edificioId: data.edificioId,
        nombreArchivo: data.nombreArchivo,
        rutaArchivo: data.rutaArchivo,
        tipo: data.tipo,
        descripcion: data.descripcion,
        tamanoBytes: data.tamanoBytes
      }
    });
  },

  /**
   * Buscar imagen por ID
   */
  async findById(id) {
    return await prisma.imagen.findUnique({
      where: { id },
      include: {
        camara: true,
        edificio: true
      }
    });
  },

  /**
   * Listar imágenes del edificio
   */
  async findByEdificio(edificioId, filtros = {}) {
    const where = { edificioId };

    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.camaraId) where.camaraId = filtros.camaraId;
    if (filtros.fechaDesde) where.fechaSubida = { gte: new Date(filtros.fechaDesde) };
    if (filtros.fechaHasta) where.fechaSubida = { lte: new Date(filtros.fechaHasta) };

    return await prisma.imagen.findMany({
      where,
      include: {
        camara: {
          select: { nombre: true, ubicacion: true }
        }
      },
      orderBy: { fechaSubida: 'desc' }
    });
  },

  /**
   * Eliminar imagen (BD y archivo físico)
   */
  async delete(id) {
    const imagen = await this.findById(id);
    if (imagen) {
      // Eliminar archivo físico
      try {
        await fs.unlink(imagen.rutaArchivo);
      } catch (err) {
        console.warn(`No se pudo eliminar archivo físico: ${imagen.rutaArchivo}`);
      }

      // Eliminar de BD
      return await prisma.imagen.delete({
        where: { id }
      });
    }
    return null;
  },

  /**
   * Verificar permisos de acceso a imagen
   */
  async verificarPermisos(imagenId, usuarioId, edificioId) {
    const imagen = await prisma.imagen.findUnique({
      where: { id: imagenId },
      include: {
        edificio: {
          select: { propietarioId: true }
        }
      }
    });

    if (!imagen) return false;

    // Verificar que la imagen pertenece al edificio del usuario
    if (imagen.edificioId !== edificioId) return false;

    // Verificar que el usuario es admin del edificio o propietario
    const esAdmin = await prisma.administrador.findFirst({
      where: {
        usuarioId,
        edificioId,
        activo: true
      }
    });

    const esPropietario = imagen.edificio.propietarioId === usuarioId;

    return esAdmin !== null || esPropietario;
  }
};

module.exports = imagenesRepository;