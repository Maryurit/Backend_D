const imagenesRepository = require("./imagenes.repository");
const auditoriaRepository = require("../auditoria/auditoria.repository");
const fs = require('fs').promises;
const path = require('path');

/**
 * Imágenes Service
 */
const imagenesService = {

  /**
   * Guardar imagen subida desde IA
   */
  async guardarImagenDesdeIA(buffer, metadata, edificioId, adminId) {
    // Crear directorio si no existe
    const uploadDir = path.join(__dirname, '../../../uploads/imagenes');
    await fs.mkdir(uploadDir, { recursive: true });

    // Generar nombre único
    const timestamp = Date.now();
    const extension = '.jpg';
    const nombreArchivo = `${metadata.tipo}_${metadata.camaraId}_${timestamp}${extension}`;
    const rutaArchivo = path.join(uploadDir, nombreArchivo);

    // Guardar archivo
    await fs.writeFile(rutaArchivo, buffer);

    // Obtener tamaño del archivo
    const stats = await fs.stat(rutaArchivo);
    const tamanoBytes = stats.size;

    // Guardar en BD
    const imagen = await imagenesRepository.create({
      camaraId: metadata.camaraId,
      edificioId: edificioId,
      nombreArchivo,
      rutaArchivo,
      tipo: metadata.tipo,
      descripcion: metadata.descripcion,
      tamanoBytes
    });

    // Registrar auditoría
    await auditoriaRepository.create(
      adminId,
      edificioId,
      'SUBIR_IMAGEN_IA',
      `Imagen ${metadata.tipo} subida desde IA: ${nombreArchivo}`
    );

    return imagen;
  },

  /**
   * Listar imágenes del edificio (solo admin/propietario)
   */
  async listarImagenes(edificioId, filtros = {}) {
    return await imagenesRepository.findByEdificio(edificioId, filtros);
  },

  /**
   * Obtener imagen por ID con verificación de permisos
   */
  async obtenerImagen(imagenId, usuarioId, edificioId) {
    const tienePermisos = await imagenesRepository.verificarPermisos(imagenId, usuarioId, edificioId);
    if (!tienePermisos) {
      throw new Error('No tienes permisos para acceder a esta imagen');
    }

    const imagen = await imagenesRepository.findById(imagenId);
    if (!imagen) {
      throw new Error('Imagen no encontrada');
    }

    return imagen;
  },

  /**
   * Eliminar imagen
   */
  async eliminarImagen(imagenId, usuarioId, edificioId, adminId) {
    const imagen = await this.obtenerImagen(imagenId, usuarioId, edificioId);

    await imagenesRepository.delete(imagenId);

    await auditoriaRepository.create(
      adminId,
      edificioId,
      'ELIMINAR_IMAGEN',
      `Imagen eliminada: ${imagen.nombreArchivo}`
    );

    return imagen;
  },

  /**
   * Limpiar imágenes antiguas según plan
   */
  async limpiarImagenesAntiguas() {
    // Esta función se ejecutará periódicamente para limpiar según límites del plan
    // Por ahora solo un placeholder
    console.log('Limpiando imágenes antiguas según planes...');
  }
};

module.exports = imagenesService;