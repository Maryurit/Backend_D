/**
 * Utilidades de ciclo de suscripción mensual por edificio.
 */

/** Días de gracia tras el vencimiento antes de degradar a plan Gratuito */
const DIAS_GRACIA_SUSCRIPCION = 3;

/** Días antes del vencimiento para avisar al propietario */
const DIAS_AVISO_PREVIO = 3;

const suscripcionUtil = {

  DIAS_GRACIA_SUSCRIPCION,
  DIAS_AVISO_PREVIO,

  /**
   * Próxima fecha de vencimiento del ciclo mensual (desde una fecha base)
   */
  calcularProximoVencimiento(desde = new Date()) {
    const fecha = new Date(desde);
    fecha.setMonth(fecha.getMonth() + 1);
    return fecha;
  },

  /**
   * Días enteros hasta una fecha (negativo = ya venció)
   */
  diasHasta(fechaObjetivo) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const meta = new Date(fechaObjetivo);
    meta.setHours(0, 0, 0, 0);
    return Math.ceil((meta - hoy) / (1000 * 60 * 60 * 24));
  },

  /**
   * Plan de pago mensual (no Gratuito)
   */
  requierePagoMensual(nombrePlan) {
    return nombrePlan !== 'GRATUITO';
  }
};

module.exports = suscripcionUtil;
