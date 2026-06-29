const backupService = require("./backup.service");
const { success, error } = require("../../shared/utils/response");

/**
 * Backup Controller - API de respaldos
 */
const backupController = {

  async crearBackup(req, res) {
    try {
      const resultado = await backupService.crearBackup();
      return success(res, resultado, 'Backup creado correctamente', 201);
    } catch (err) {
      console.error('Error creando backup:', err);
      return error(res, err.message, 500);
    }
  },

  async listarBackups(req, res) {
    try {
      const backups = await backupService.listarBackups();
      return success(res, backups, 'Backups listados correctamente');
    } catch (err) {
      console.error('Error listando backups:', err);
      return error(res, err.message, 500);
    }
  },

  async obtenerBackup(req, res) {
    try {
      const { nombreBackup } = req.params;
      const backup = await backupService.obtenerBackup(nombreBackup);
      return success(res, backup, 'Backup encontrado correctamente');
    } catch (err) {
      console.error('Error obteniendo backup:', err);
      return error(res, err.message, 404);
    }
  }
};

module.exports = backupController;