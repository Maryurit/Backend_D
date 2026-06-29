const imagenesService = require("./imagenes.service");
const { success, error } = require("../../shared/utils/response");
const multer = require('multer');
const path = require('path');

// Configuración de multer para subida de imágenes desde IA
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

/**
 * Imágenes Controller
 */
const imagenesController = {

  /**
   * Subir imagen desde IA (sin autenticación JWT, usa SERVICE_TOKEN)
   */
  async subirDesdeIA(req, res) {
    try {
      if (!req.file) {
        return error(res, 'No se recibió ninguna imagen', 400);
      }

      const { camaraId, tipo, descripcion } = req.body;
      if (!camaraId || !tipo) {
        return error(res, 'camaraId y tipo son obligatorios', 400);
      }

      // Obtener edificioId desde la cámara
      const prisma = require("../../shared/config/database");
      const camara = await prisma.camara.findUnique({
        where: { id: camaraId },
        select: { edificioId: true }
      });

      if (!camara) {
        return error(res, 'Cámara no encontrada', 404);
      }

      const imagen = await imagenesService.guardarImagenDesdeIA(
        req.file.buffer,
        { camaraId, tipo, descripcion: descripcion || '' },
        camara.edificioId,
        null // Auditoría sin usuario porque la IA no es un usuario del sistema
      );

      return success(res, {
        id: imagen.id,
        url: `/api/imagenes/${imagen.id}`
      }, 'Imagen subida correctamente');

    } catch (err) {
      return error(res, err.message, 500);
    }
  },

  /**
   * Listar imágenes del edificio (solo admin/propietario)
   */
  async listar(req, res) {
    try {
      const filtros = {
        tipo: req.query.tipo,
        camaraId: req.query.camaraId,
        fechaDesde: req.query.fechaDesde,
        fechaHasta: req.query.fechaHasta
      };

      const imagenes = await imagenesService.listarImagenes(req.user.edificioId, filtros);
      return success(res, imagenes, 'Imágenes listadas correctamente');

    } catch (err) {
      return error(res, err.message);
    }
  },

  /**
   * Servir imagen (con verificación de permisos)
   */
  async obtenerImagen(req, res) {
    try {
      const { id } = req.params;
      const imagen = await imagenesService.obtenerImagen(id, req.user.id, req.user.edificioId);

      // Verificar que el archivo existe
      const fs = require('fs').promises;
      try {
        await fs.access(imagen.rutaArchivo);
      } catch {
        return error(res, 'Archivo de imagen no encontrado', 404);
      }

      // Enviar archivo
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `inline; filename="${imagen.nombreArchivo}"`);

      const fsStream = require('fs');
      const stream = fsStream.createReadStream(imagen.rutaArchivo);
      stream.pipe(res);

    } catch (err) {
      return error(res, err.message, 403);
    }
  },

  /**
   * Eliminar imagen
   */
  async eliminar(req, res) {
    try {
      const { id } = req.params;
      const imagen = await imagenesService.eliminarImagen(id, req.user.id, req.user.edificioId, req.user.id);
      return success(res, imagen, 'Imagen eliminada correctamente');

    } catch (err) {
      return error(res, err.message, 400);
    }
  }
};

module.exports = { imagenesController, upload };