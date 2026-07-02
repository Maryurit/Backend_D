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

// ============================================================
// MIDDLEWARES DE SEGURIDAD
// ============================================================
app.use(helmet());

// CORS dinámico usando variables de entorno (¡no IPs hardcodeadas!)
const allowedOrigins = [
  process.env.FRONTEND_URL,
].filter(Boolean);

console.log('✅ CORS allowed origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin origin (ej. Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// ============================================================
// RUTAS PÚBLICAS
// ============================================================
app.use('/api/auth', authRoutes);

// ============================================================
// RUTAS PROTEGIDAS
// ============================================================
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

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => {
  res.json({ success: true, message: '✅ Backend funcionando correctamente' });
});

// ============================================================
// MANEJO DE ERRORES
// ============================================================
app.use(errorMiddleware);

module.exports = app;