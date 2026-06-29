const prisma = require("../config/database");
const planLimitsUtil = require('../utils/planLimits.util');

/**
 * Middleware de validación de planes SaaS por edificio.
 * Cada edificio tiene su propia suscripción; la IA y los usuarios heredan esos límites.
 */
const planValidation = {

  /**
   * Carga suscripción del edificio en req.suscripcionEdificio
   */
  async _cargarSuscripcion(edificioId) {
    return await planLimitsUtil.obtenerSuscripcionEdificio(edificioId);
  },

  /**
   * Validar límites de análisis de IA según plan (usuarios autenticados)
   */
  validarAnalisisIA: async (req, res, next) => {
    try {
      const edificioId = req.user?.edificioId;
      if (!edificioId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes un edificio asignado'
        });
      }

      const suscripcion = await planValidation._cargarSuscripcion(edificioId);

      if (!suscripcion || !suscripcion.activa) {
        return res.status(403).json({
          success: false,
          message: 'No tienes una suscripción activa'
        });
      }

      const plan = suscripcion.plan.nombre;

      if (req.body.tipoEvento === 'SOSPECHOSA' && plan === 'GRATUITO') {
        return res.status(403).json({
          success: false,
          message: 'El análisis de conducta sospechosa requiere plan Estándar o Premium'
        });
      }

      if (req.body.tipoEvento === 'PLACA' && !suscripcion.plan.permiteIaPlacas) {
        return res.status(403).json({
          success: false,
          message: 'La detección de placas con IA no está incluida en tu plan actual'
        });
      }

      req.plan = {
        nombre: plan,
        permiteIaPlacas: suscripcion.plan.permiteIaPlacas,
        permiteMetricasAvanzadas: suscripcion.plan.permiteMetricasAvanzadas,
        maxUnidades: suscripcion.plan.maxUnidades
      };

      next();
    } catch (error) {
      console.error('Error en validación de plan:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  /**
   * Validar ventana de historial de accesos según plan del edificio consultado
   */
  validarHistorial: async (req, res, next) => {
    try {
      // Propietario puede filtrar por edificioId; admin/inquilino usan su edificio asignado
      const edificioId =
        req.query.edificioId ||
        req.params.edificioId ||
        req.user?.edificioId;

      if (!edificioId) return next();

      const suscripcion = await planValidation._cargarSuscripcion(edificioId);
      if (!suscripcion) return next();

      const plan = suscripcion.plan.nombre;
      const limiteDias = planLimitsUtil.diasHistorialPermitidos(plan);

      req.limiteHistorial = {
        dias: limiteDias,
        plan,
        edificioId,
        fechaMinima: new Date(Date.now() - limiteDias * 24 * 60 * 60 * 1000)
      };

      next();
    } catch (error) {
      console.error('Error en validación de historial:', error);
      next();
    }
  },

  /**
   * Validar límites de consultas de imágenes según plan
   */
  validarConsultas: async (req, res, next) => {
    try {
      const edificioId = req.query.edificioId || req.user?.edificioId;

      if (edificioId) {
        const suscripcion = await planValidation._cargarSuscripcion(edificioId);
        if (suscripcion) {
          req.plan = {
            nombre: suscripcion.plan.nombre,
            permiteMetricasAvanzadas: suscripcion.plan.permiteMetricasAvanzadas
          };
        }
      }

      const plan = req.plan?.nombre || 'GRATUITO';

      if (plan === 'GRATUITO') {
        const hoy = new Date().toISOString().split('T')[0];
        if (req.query.fechaDesde && req.query.fechaDesde !== hoy) {
          return res.status(403).json({
            success: false,
            message: 'El plan Gratuito solo permite consultas del día actual'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Error en validación de consultas:', error);
      next();
    }
  },

  /**
   * Validar subida de imágenes según plan del edificio
   */
  validarImagenes: async (req, res, next) => {
    try {
      const edificioId = req.body?.edificioId || req.user?.edificioId;
      if (!edificioId) return next();

      const suscripcion = await planValidation._cargarSuscripcion(edificioId);
      if (!suscripcion) return next();

      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const count = await prisma.imagen.count({
        where: {
          edificioId,
          fechaSubida: { gte: inicioMes }
        }
      });

      const plan = suscripcion.plan.nombre;
      const limiteMensual = planLimitsUtil.limiteImagenesMensual(plan);

      if (count >= limiteMensual) {
        return res.status(429).json({
          success: false,
          message: `Has alcanzado el límite mensual de ${limiteMensual} imágenes para el plan ${plan}`
        });
      }

      req.plan = {
        nombre: plan,
        permiteIaPlacas: suscripcion.plan.permiteIaPlacas,
        permiteMetricasAvanzadas: suscripcion.plan.permiteMetricasAvanzadas
      };

      next();
    } catch (error) {
      console.error('Error en validación de imágenes:', error);
      next();
    }
  },

  /**
   * Métricas avanzadas (financieras, IA detallada, completas) — solo plan Premium
   */
  validarMetricasAvanzadas: async (req, res, next) => {
    try {
      const edificioId = req.params.edificioId;

      if (!edificioId) {
        return res.status(400).json({
          success: false,
          message: 'edificioId es requerido'
        });
      }

      const suscripcion = await planValidation._cargarSuscripcion(edificioId);

      if (!suscripcion || !suscripcion.activa) {
        return res.status(403).json({
          success: false,
          message: 'El edificio no tiene suscripción activa'
        });
      }

      if (!suscripcion.plan.permiteMetricasAvanzadas) {
        return res.status(403).json({
          success: false,
          message:
            'Las métricas avanzadas requieren plan Premium. ' +
            `Plan actual del edificio: ${suscripcion.plan.nombre}`
        });
      }

      req.plan = {
        nombre: suscripcion.plan.nombre,
        permiteMetricasAvanzadas: true,
        edificioId
      };

      next();
    } catch (error) {
      console.error('Error en validación de métricas avanzadas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  /**
   * Validación de plan para servicio IA (sin usuario, usa camaraId → edificio)
   */
  validarAnalisisIAServicio: async (req, res, next) => {
    try {
      const { camaraId } = req.body;

      if (!camaraId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere camaraId para validación de servicio IA'
        });
      }

      const camara = await prisma.camara.findUnique({
        where: { id: camaraId },
        include: {
          edificio: {
            include: {
              suscripcion: {
                include: { plan: true }
              }
            }
          }
        }
      });

      if (!camara || !camara.edificio) {
        return res.status(404).json({
          success: false,
          message: 'Cámara o edificio no encontrado'
        });
      }

      const suscripcion = camara.edificio.suscripcion;

      if (!suscripcion || !suscripcion.activa) {
        return res.status(403).json({
          success: false,
          message: 'El edificio no tiene una suscripción activa'
        });
      }

      const plan = suscripcion.plan.nombre;

      if (req.body.tipoEvento === 'SOSPECHOSA' && plan === 'GRATUITO') {
        return res.status(403).json({
          success: false,
          message: 'El análisis de conducta sospechosa requiere plan Estándar o Premium'
        });
      }

      if (req.body.tipoEvento === 'PLACA' && !suscripcion.plan.permiteIaPlacas) {
        return res.status(403).json({
          success: false,
          message: 'La detección de placas con IA no está incluida en el plan de este edificio'
        });
      }

      req.plan = {
        nombre: plan,
        permiteIaPlacas: suscripcion.plan.permiteIaPlacas,
        permiteMetricasAvanzadas: suscripcion.plan.permiteMetricasAvanzadas,
        maxUnidades: suscripcion.plan.maxUnidades
      };
      req.edificioId = camara.edificioId;
      req.camara = camara;

      next();
    } catch (error) {
      console.error('Error en validación IA servicio:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno en validación de servicio'
      });
    }
  }
};

module.exports = planValidation;
