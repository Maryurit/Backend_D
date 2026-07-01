const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorMiddleware = require('./shared/middlewares/error.middleware');

// Rutas modulares
const authRoutes = require('./modules/auth/auth.routes');
const edificiosRoutes = require('./modules/edificios/edificios.routes');
const usuariosRoutes = require('./modules/usuarios/usuarios.routes');
const unidadesRoutes = require('./modules/unidades/unidades.routes');
const inquilinosRoutes = require('./modules/inquilinos/inquilinos.routes');
const vehiculosRoutes = require('./modules/vehiculos/vehiculos.routes');
const camarasRoutes = require('./modules/camaras/camaras.routes');
const accesosRoutes = require('./modules/accesos/accesos.routes');
const imagenesRoutes = require('./modules/imagenes/imagenes.routes');
const dashboardsRoutes = require('./modules/dashboards/dashboards.routes');
const notificacionesRoutes = require('./modules/notificaciones/notificaciones.routes');
const pagosRoutes = require('./modules/pagos/pagos.routes');
const reportesRoutes = require('./modules/reportes/reportes.routes');
const metricasRoutes = require('./modules/metricas/metricas.routes');
const backupRoutes = require('./modules/backup/backup.routes');
const auditoriaRoutes = require('./modules/auditoria/auditoria.routes');
const administradoresRoutes = require('./modules/administradores/administradores.routes');

const app = express();

// Middlewares de seguridad
app.use(helmet());
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Rutas públicas
app.use('/api/auth', authRoutes);

// Rutas protegidas
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/edificios', edificiosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/unidades', unidadesRoutes);
app.use('/api/inquilinos', inquilinosRoutes);
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/camaras', camarasRoutes);
app.use('/api/accesos', accesosRoutes);
app.use('/api/imagenes', imagenesRoutes);
app.use('/api/dashboard', dashboardsRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/metricas', metricasRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/administradores', administradoresRoutes);
// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: '✅ Backend funcionando correctamente' });
});

app.use(errorMiddleware);

module.exports = app;
