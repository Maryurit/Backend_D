const prisma = require("../../shared/config/database");
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

const BACKUP_BASE_PATH = path.resolve(__dirname, '../../../backups');

/**
 * Backup Service - Respaldo de base de datos y archivos
 */
const backupService = {

  async asegurarCarpetaBackup() {
    await fsPromises.mkdir(BACKUP_BASE_PATH, { recursive: true });
  },

  generarNombreBackup() {
    const fecha = new Date();
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    const h = String(fecha.getHours()).padStart(2, '0');
    const min = String(fecha.getMinutes()).padStart(2, '0');
    const s = String(fecha.getSeconds()).padStart(2, '0');
    return `backup-${y}${m}${d}-${h}${min}${s}`;
  },

  async exportarModelo(modelo, where = {}) {
    return await prisma[modelo].findMany({ where });
  },

  async crearBackup() {
    await this.asegurarCarpetaBackup();

    const nombreBackup = this.generarNombreBackup();
    const rutaBackup = path.join(BACKUP_BASE_PATH, nombreBackup);
    await fsPromises.mkdir(rutaBackup, { recursive: true });

    const modelos = [
      'usuario',
      'edificio',
      'unidad',
      'inquilino',
      'vehiculo',
      'camara',
      'historialAcceso',
      'alerta',
      'notificacion',
      'solicitud',
      'suscripcion',
      'imagen',
      'auditoria'
    ];

    const archivosExportados = [];

    for (const modelo of modelos) {
      try {
        const registros = await this.exportarModelo(modelo);
        const nombreArchivo = `${modelo}.json`;
        const rutaArchivo = path.join(rutaBackup, nombreArchivo);
        await fsPromises.writeFile(rutaArchivo, JSON.stringify(registros, null, 2), 'utf8');
        archivosExportados.push({ modelo, cantidad: registros.length, archivo: nombreArchivo });
      } catch (error) {
        console.warn(`No se pudo exportar modelo ${modelo}: ${error.message}`);
      }
    }

    // Copiar archivos estáticos si existen
    const rutasArchivos = [
      path.resolve(__dirname, '../../public'),
      path.resolve(__dirname, '../../uploads')
    ];

    for (const ruta of rutasArchivos) {
      if (fs.existsSync(ruta)) {
        const nombreDestino = path.join(rutaBackup, path.basename(ruta));
        await this.copiarDirectorio(ruta, nombreDestino);
      }
    }

    const log = {
      fecha: new Date().toISOString(),
      backup: nombreBackup,
      archivos: archivosExportados,
      directoriosCopiados: rutasArchivos.filter(ruta => fs.existsSync(ruta)).map(ruta => path.basename(ruta))
    };

    await fsPromises.writeFile(path.join(rutaBackup, 'backup-log.json'), JSON.stringify(log, null, 2), 'utf8');

    return {
      nombreBackup,
      rutaBackup,
      archivosExportados: archivosExportados.length,
      directoriosCopiados: log.directoriosCopiados
    };
  },

  async copiarDirectorio(origen, destino) {
    await fsPromises.mkdir(destino, { recursive: true });
    const elementos = await fsPromises.readdir(origen, { withFileTypes: true });
    for (const elemento of elementos) {
      const rutaOrigen = path.join(origen, elemento.name);
      const rutaDestino = path.join(destino, elemento.name);
      if (elemento.isDirectory()) {
        await this.copiarDirectorio(rutaOrigen, rutaDestino);
      } else {
        await fsPromises.copyFile(rutaOrigen, rutaDestino);
      }
    }
  },

  async listarBackups() {
    await this.asegurarCarpetaBackup();
    const backups = await fsPromises.readdir(BACKUP_BASE_PATH, { withFileTypes: true });
    return backups
      .filter(item => item.isDirectory())
      .map(item => ({ nombre: item.name }));
  },

  async obtenerBackup(nombreBackup) {
    const rutaBackup = path.join(BACKUP_BASE_PATH, nombreBackup);
    const existe = fs.existsSync(rutaBackup);
    if (!existe) {
      throw new Error('Backup no encontrado');
    }
    const archivos = await fsPromises.readdir(rutaBackup);
    return { nombreBackup, rutaBackup, archivos };
  }
};

module.exports = backupService;