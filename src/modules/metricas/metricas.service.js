const prisma = require("../../shared/config/database");

/**
 * Métricas Service - Métricas avanzadas del sistema
 */
const metricasService = {

  /**
   * Obtener métricas generales del sistema
   */
  async obtenerMetricasGenerales() {
    try {
      const [
        totalEdificios,
        totalUsuarios,
        totalInquilinos,
        totalVehiculos,
        totalAdministradores,
        totalAlertas,
        totalAccesos
      ] = await Promise.all([
        prisma.edificio.count(),
        prisma.usuario.count(),
        prisma.inquilino.count(),
        prisma.vehiculo.count(),
        prisma.administrador.count(),
        prisma.alerta.count(),
        prisma.historialAcceso.count()
      ]);

      // Estadísticas de los últimos 30 días
      const fechaHace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [
        nuevosUsuarios,
        nuevosInquilinos,
        alertasRecientes,
        accesosRecientes
      ] = await Promise.all([
        prisma.usuario.count({ where: { fechaCreacion: { gte: fechaHace30Dias } } }),
        prisma.inquilino.count({ where: { fechaCreacion: { gte: fechaHace30Dias } } }),
        prisma.alerta.count({ where: { fechaCreacion: { gte: fechaHace30Dias } } }),
        prisma.historialAcceso.count({ where: { fechaEvento: { gte: fechaHace30Dias } } })
      ]);

      return {
        totales: {
          edificios: totalEdificios,
          usuarios: totalUsuarios,
          inquilinos: totalInquilinos,
          vehiculos: totalVehiculos,
          administradores: totalAdministradores,
          alertas: totalAlertas,
          accesos: totalAccesos
        },
        ultimos30Dias: {
          nuevosUsuarios,
          nuevosInquilinos,
          alertas: alertasRecientes,
          accesos: accesosRecientes
        },
        tasasCrecimiento: {
          usuarios: totalUsuarios > 0 ? ((nuevosUsuarios / totalUsuarios) * 100).toFixed(1) : 0,
          inquilinos: totalInquilinos > 0 ? ((nuevosInquilinos / totalInquilinos) * 100).toFixed(1) : 0
        }
      };

    } catch (error) {
      console.error('Error obteniendo métricas generales:', error);
      throw new Error('Error al obtener métricas generales');
    }
  },

  /**
   * Obtener métricas de seguridad por edificio
   */
  async obtenerMetricasSeguridad(edificioId) {
    try {
      const fechaHace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Alertas por tipo
      const alertasPorTipo = await prisma.alerta.groupBy({
        by: ['nivel'],
        where: {
          edificioId,
          fechaCreacion: { gte: fechaHace30Dias }
        },
        _count: { nivel: true }
      });

      // Accesos por día de la semana
      const accesosPorDia = await prisma.$queryRaw`
        SELECT
          EXTRACT(DOW FROM "fechaEvento") as dia_semana,
          COUNT(*) as total_accesos
        FROM "HistorialAcceso"
        WHERE "edificioId" = ${edificioId}
          AND "fechaEvento" >= ${fechaHace30Dias}
        GROUP BY EXTRACT(DOW FROM "fechaEvento")
        ORDER BY dia_semana
      `;

      // Horas pico de actividad
      const actividadPorHora = await prisma.$queryRaw`
        SELECT
          EXTRACT(HOUR FROM "fechaEvento") as hora,
          COUNT(*) as total_actividad
        FROM "HistorialAcceso"
        WHERE "edificioId" = ${edificioId}
          AND "fechaEvento" >= ${fechaHace30Dias}
        GROUP BY EXTRACT(HOUR FROM "fechaEvento")
        ORDER BY hora
      `;

      // Estadísticas de alertas
      const statsAlertas = alertasPorTipo.reduce((acc, alerta) => {
        acc[alerta.nivel.toLowerCase()] = alerta._count.nivel;
        return acc;
      }, { media: 0, alta: 0, critica: 0 });

      return {
        alertasPorTipo: statsAlertas,
        accesosPorDia: accesosPorDia,
        actividadPorHora: actividadPorHora,
        periodo: 'últimos 30 días'
      };

    } catch (error) {
      console.error('Error obteniendo métricas de seguridad:', error);
      throw new Error('Error al obtener métricas de seguridad');
    }
  },

  /**
   * Métricas financieras por edificio — solo boletas de suscripción ya pagadas.
   */
  async obtenerMetricasFinancieras(edificioId) {
    try {
      const fechaHace12Meses = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

      const ingresosMensuales = await prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', "fechaPago") as mes,
          SUM("monto") as ingresos
        FROM "facturas"
        WHERE "edificioId" = ${edificioId}
          AND "estado" = 'PAGADA'
          AND "fechaPago" >= ${fechaHace12Meses}
        GROUP BY DATE_TRUNC('month', "fechaPago")
        ORDER BY mes
      `;

      const resumen = await prisma.factura.aggregate({
        where: {
          edificioId,
          estado: 'PAGADA',
          fechaPago: { gte: fechaHace12Meses }
        },
        _sum: { monto: true },
        _count: { id: true }
      });

      return {
        ingresosMensuales,
        totalBoletas: resumen._count.id,
        ingresosTotales: resumen._sum.monto || 0,
        periodo: 'últimos 12 meses'
      };

    } catch (error) {
      console.error('Error obteniendo métricas financieras:', error);
      throw new Error('Error al obtener métricas financieras');
    }
  },

  /**
   * Obtener métricas de ocupación por edificio
   */
  async obtenerMetricasOcupacion(edificioId) {
    try {
      const edificio = await prisma.edificio.findUnique({
        where: { id: edificioId },
        include: {
          unidades: {
            include: {
              inquilino: true
            }
          }
        }
      });

      if (!edificio) {
        throw new Error('Edificio no encontrado');
      }

      const totalUnidades = edificio.unidades.length;
      const unidadesOcupadas = edificio.unidades.filter(u => u.inquilino).length;
      const tasaOcupacion = totalUnidades > 0 ? (unidadesOcupadas / totalUnidades * 100).toFixed(1) : 0;

      // Contratos por estado
      const contratosPorEstado = await prisma.inquilino.groupBy({
        by: ['estadoContrato'],
        where: { edificioId },
        _count: { estadoContrato: true }
      });

      const estadosContratos = contratosPorEstado.reduce((acc, contrato) => {
        acc[contrato.estadoContrato.toLowerCase()] = contrato._count.estadoContrato;
        return acc;
      }, { activo: 0, vencido: 0, suspendido: 0 });

      // Contratos próximos a vencer (30 días)
      const contratosPorVencer = await prisma.inquilino.count({
        where: {
          edificioId,
          estadoContrato: 'ACTIVO',
          fechaFinContrato: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date()
          }
        }
      });

      return {
        totalUnidades,
        unidadesOcupadas,
        unidadesDisponibles: totalUnidades - unidadesOcupadas,
        tasaOcupacion: parseFloat(tasaOcupacion),
        contratosPorEstado: estadosContratos,
        contratosPorVencer
      };

    } catch (error) {
      console.error('Error obteniendo métricas de ocupación:', error);
      throw new Error('Error al obtener métricas de ocupación');
    }
  },

  /**
   * Obtener métricas de rendimiento del sistema IA
   */
  async obtenerMetricasIA(edificioId) {
    try {
      const fechaHace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Rendimiento de detección de placas
      const deteccionesPlacas = await prisma.historialAcceso.count({
        where: {
          edificioId,
          tipo: 'PLACA',
          fechaEvento: { gte: fechaHace30Dias }
        }
      });

      // Alertas de conducta sospechosa
      const alertasSospechosas = await prisma.historialAcceso.count({
        where: {
          edificioId,
          alerta: { isNot: null },
          fechaEvento: { gte: fechaHace30Dias }
        }
      });

      // Tasa de éxito de reconocimiento
      const totalEventosIA = deteccionesPlacas + alertasSospechosas;
      const tasaExitoReconocimiento = totalEventosIA > 0 ? (deteccionesPlacas / totalEventosIA * 100).toFixed(1) : 0;

      // Alertas por tipo de conducta
      const alertasPorTipo = await prisma.alerta.findMany({
        where: {
          edificioId,
          fechaCreacion: { gte: fechaHace30Dias }
        },
        select: { descripcion: true }
      });

      // Categorizar alertas
      const categoriasAlertas = {
        movimiento_sospechoso: 0,
        persona_no_autorizada: 0,
        vehiculo_sospechoso: 0,
        otros: 0
      };

      alertasPorTipo.forEach(alerta => {
        const desc = alerta.descripcion.toLowerCase();
        if (desc.includes('movimiento') || desc.includes('conducta')) {
          categoriasAlertas.movimiento_sospechoso++;
        } else if (desc.includes('persona') || desc.includes('intruso')) {
          categoriasAlertas.persona_no_autorizada++;
        } else if (desc.includes('vehiculo') || desc.includes('placa')) {
          categoriasAlertas.vehiculo_sospechoso++;
        } else {
          categoriasAlertas.otros++;
        }
      });

      return {
        deteccionesPlacas,
        alertasSospechosas,
        totalEventosIA,
        tasaExitoReconocimiento: parseFloat(tasaExitoReconocimiento),
        categoriasAlertas,
        periodo: 'últimos 30 días'
      };

    } catch (error) {
      console.error('Error obteniendo métricas IA:', error);
      throw new Error('Error al obtener métricas IA');
    }
  },

  /**
   * Obtener todas las métricas de un edificio
   */
  async obtenerMetricasCompletas(edificioId) {
    try {
      const [
        generales,
        seguridad,
        financieras,
        ocupacion,
        ia
      ] = await Promise.all([
        this.obtenerMetricasGenerales(),
        this.obtenerMetricasSeguridad(edificioId),
        this.obtenerMetricasFinancieras(edificioId),
        this.obtenerMetricasOcupacion(edificioId),
        this.obtenerMetricasIA(edificioId)
      ]);

      return {
        edificioId,
        generales,
        seguridad,
        financieras,
        ocupacion,
        ia,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error obteniendo métricas completas:', error);
      throw new Error('Error al obtener métricas completas');
    }
  }
};

module.exports = metricasService;