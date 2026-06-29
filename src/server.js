require('dotenv').config();
const app = require('./app');
const backupService = require('./modules/backup/backup.service');

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`🚀 Servidor depamanager corriendo en http://localhost:${PORT}`);
  console.log(`📡 Prueba la ruta: GET http://localhost:${PORT}/health`);

  try {
    await backupService.asegurarCarpetaBackup();
    console.log('✅ Backup programado listo');
  } catch (error) {
    console.warn('⚠️ No se pudo preparar la carpeta de backup:', error.message);
  }

  setInterval(async () => {
    try {
      const resultado = await backupService.crearBackup();
      console.log(`📦 Backup automático generado: ${resultado.nombreBackup}`);
    } catch (backupError) {
      console.error('❌ Error al generar backup automático:', backupError);
    }
  }, 24 * 60 * 60 * 1000); // cada 24 horas
});
