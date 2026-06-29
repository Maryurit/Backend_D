const prisma = require('../config/database');

/**
 * Utilidades centralizadas de planes SaaS por edificio.
 * Toda validación de límites (unidades, métricas, historial) debe usar este módulo.
 */

/** Jerarquía de planes para comparar upgrades */
const ORDEN_PLAN = {
  GRATUITO: 0,
  ESTANDAR: 1,
  PREMIUM: 2
};

const planLimitsUtil = {

  ORDEN_PLAN,

  /**
   * Obtiene suscripción activa del edificio con datos del plan
   */
  async obtenerSuscripcionEdificio(edificioId) {
    if (!edificioId) return null;

    return await prisma.suscripcion.findUnique({
      where: { edificioId },
      include: {
        plan: true,
        edificio: { select: { id: true, nombre: true, propietarioId: true, activo: true } }
      }
    });
  },

  /**
   * Compara si planDestino es superior al planActual
   */
  esUpgrade(planActual, planDestino) {
    const actual = ORDEN_PLAN[planActual] ?? -1;
    const destino = ORDEN_PLAN[planDestino] ?? -1;
    return destino > actual;
  },

  /**
   * Días de historial de accesos permitidos según plan (alineado con planValidation.middleware)
   */
  diasHistorialPermitidos(nombrePlan) {
    if (nombrePlan === 'GRATUITO') return 7;
    if (nombrePlan === 'ESTANDAR') return 180;
    return 365; // PREMIUM
  },

  /**
   * Límite mensual de imágenes IA por plan
   */
  limiteImagenesMensual(nombrePlan) {
    if (nombrePlan === 'GRATUITO') return 50;
    if (nombrePlan === 'ESTANDAR') return 500;
    return 1000; // PREMIUM
  },

  /**
   * Valida que el edificio pueda crear N unidades más sin superar maxUnidades del plan
   */
  async validarCreacionUnidades(edificioId, cantidadNueva = 1) {
    const suscripcion = await this.obtenerSuscripcionEdificio(edificioId);

    if (!suscripcion || !suscripcion.activa) {
      throw new Error('El edificio no tiene una suscripción activa');
    }

    const maxUnidades = suscripcion.plan.maxUnidades;
    const unidadesActivas = await prisma.unidad.count({
      where: { edificioId, activa: true }
    });

    if (unidadesActivas + cantidadNueva > maxUnidades) {
      throw new Error(
        `Límite del plan ${suscripcion.plan.nombre}: máximo ${maxUnidades} unidades. ` +
        `Actualmente tienes ${unidadesActivas} y quieres agregar ${cantidadNueva}.`
      );
    }

    return { plan: suscripcion.plan.nombre, unidadesActivas, maxUnidades };
  }
};

module.exports = planLimitsUtil;
