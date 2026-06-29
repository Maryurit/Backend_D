const prisma = require("../../shared/config/database");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const edificiosRepository = require('../edificios/edificios.repository');
const planesRepository = require('../edificios/planes.repository');
const planLimitsUtil = require('../../shared/utils/planLimits.util');
const suscripcionUtil = require('../../shared/utils/suscripcion.util');
const { generarHTMLBoleta } = require('../../shared/utils/boletaPdf.util');
const reportesService = require('../reportes/reportes.service');
const notificacionesService = require('../notificaciones/notificaciones.service');

const EXPIRACION_SESION_PAGO = '30m';

/**
 * Pagos Service — Suscripción mensual SaaS por edificio.
 *
 * Ciclo: pago confirmado → boleta → extiende fechaFin +1 mes (días de gracia: 3).
 * Recordatorios al propietario: vía notificaciones.service (job diario).
 * El administrador hereda el plan del edificio (misma suscripción).
 */
const pagosService = {

  generarCodigoPago() {
    return 'YAPE-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  },

  /**
   * Verificación REALISTA de pago con pasarela YAPE.
   * Simula latencia de red, validación de formato, y genera referencia única.
   * En producción, esto se conectaría a la API real de YAPE/Culqi.
   */
  async simularVerificacionPasarela({ codigoPago, monto, edificioId }) {
    // Validación estricta del código YAPE
    if (!codigoPago || !codigoPago.startsWith('YAPE-')) {
      throw new Error('Código de pago inválido: debe comenzar con YAPE-');
    }
    // El código generado es: YAPE- + 8 caracteres hex (4 bytes) = 13 caracteres
    if (codigoPago.length < 10 || codigoPago.length > 20) {
      throw new Error('Código de pago inválido: longitud incorrecta');
    }
    if (!monto || Number(monto) <= 0) {
      throw new Error('Monto de pago inválido: debe ser mayor a 0');
    }
    if (Number(monto) > 10000) {
      throw new Error('Monto excede el límite máximo permitido (S/ 10,000)');
    }

    // Simular latencia de red realista (500-1500ms)
    const latencia = Math.floor(Math.random() * 1000) + 500;
    await new Promise((resolve) => setTimeout(resolve, latencia));

    // Generar referencia única de transacción (similar a YAPE real)
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const referenciaPasarela = `YAPE-${timestamp}-${randomSuffix}`;

    // Simular validación adicional (en producción, esto sería una llamada API real)
    const pagoExitoso = Math.random() > 0.05; // 95% de éxito (realista)
    
    if (!pagoExitoso) {
      throw new Error('La pasarela de pago rechazó la transacción. Intenta nuevamente.');
    }

    return {
      aprobado: true,
      referenciaPasarela,
      edificioId,
      monto: Number(monto),
      metodoPago: 'YAPE',
      fechaProcesamiento: new Date(),
      mensaje: 'Pago verificado y procesado exitosamente'
    };
  },

  /**
   * Crea sesión JWT de checkout (upgrade o renovación mensual).
   */
  _crearSesionPago(payloadBase) {
    const codigoPago = this.generarCodigoPago();
    const tokenPago = jwt.sign(
      { ...payloadBase, codigoPago },
      process.env.JWT_SECRET,
      { expiresIn: EXPIRACION_SESION_PAGO }
    );
    return { tokenPago, codigoPago };
  },

  /**
   * PASO 1 — Upgrade a plan superior (pago mensual del nuevo plan).
   */
  async iniciarUpgradePlan(edificioId, nuevoPlanNombre, propietarioId) {
    const edificio = await edificiosRepository.findById(edificioId);

    if (!edificio || edificio.propietarioId !== propietarioId) {
      throw new Error('No tienes permiso para gestionar este edificio');
    }
    if (!edificio.activo) {
      throw new Error('El edificio no está activo');
    }

    const planDestino = await planesRepository.findByName(nuevoPlanNombre);
    if (!planDestino) {
      throw new Error('Plan no encontrado');
    }

    const planActualNombre = edificio.suscripcion?.plan?.nombre || 'GRATUITO';

    if (planActualNombre === nuevoPlanNombre) {
      throw new Error('El edificio ya tiene ese plan');
    }
    if (!planLimitsUtil.esUpgrade(planActualNombre, nuevoPlanNombre)) {
      throw new Error('Solo se permiten mejoras de plan (Estándar o Premium)');
    }

    const monto = Number(planDestino.precioMensual);
    if (monto <= 0) {
      throw new Error('Este plan no requiere pago en línea');
    }

    const mesLabel = new Date().toLocaleString('es-PE', { month: 'long', year: 'numeric' });
    const descripcion = `Suscripción ${nuevoPlanNombre} - ${edificio.nombre} (${mesLabel})`;

    const { tokenPago, codigoPago } = this._crearSesionPago({
      tipo: 'PAGO_SUSCRIPCION',
      operacion: 'UPGRADE',
      edificioId,
      propietarioId,
      nuevoPlan: nuevoPlanNombre,
      planDestinoId: planDestino.id,
      monto,
      descripcion
    });

    return this._respuestaSesionPago({
      tokenPago,
      codigoPago,
      monto,
      descripcion,
      edificio,
      planActual: planActualNombre,
      planDestino: nuevoPlanNombre,
      operacion: 'UPGRADE',
      proximoVencimiento: suscripcionUtil.calcularProximoVencimiento()
    });
  },

  /**
   * PASO 1 — Renovación mensual del plan actual (mismo plan, nuevo ciclo).
   */
  async iniciarRenovacionMensual(edificioId, propietarioId) {
    const edificio = await edificiosRepository.findById(edificioId);

    if (!edificio || edificio.propietarioId !== propietarioId) {
      throw new Error('No tienes permiso para gestionar este edificio');
    }

    const planActual = edificio.suscripcion?.plan;
    if (!planActual || !suscripcionUtil.requierePagoMensual(planActual.nombre)) {
      throw new Error('Este edificio no tiene un plan de pago mensual activo');
    }

    const monto = Number(planActual.precioMensual);
    if (monto <= 0) {
      throw new Error('El plan actual no requiere renovación de pago');
    }

    const mesLabel = new Date().toLocaleString('es-PE', { month: 'long', year: 'numeric' });
    const descripcion = `Renovación mensual ${planActual.nombre} - ${edificio.nombre} (${mesLabel})`;

    const { tokenPago, codigoPago } = this._crearSesionPago({
      tipo: 'PAGO_SUSCRIPCION',
      operacion: 'RENOVACION',
      edificioId,
      propietarioId,
      nuevoPlan: planActual.nombre,
      planDestinoId: planActual.id,
      monto,
      descripcion
    });

    const diasRestantes = edificio.suscripcion?.fechaFin
      ? suscripcionUtil.diasHasta(edificio.suscripcion.fechaFin)
      : null;

    return this._respuestaSesionPago({
      tokenPago,
      codigoPago,
      monto,
      descripcion,
      edificio,
      planActual: planActual.nombre,
      planDestino: planActual.nombre,
      operacion: 'RENOVACION',
      diasRestantesVencimiento: diasRestantes,
      diasGracia: edificio.suscripcion?.diasGracia ?? suscripcionUtil.DIAS_GRACIA_SUSCRIPCION,
      proximoVencimiento: suscripcionUtil.calcularProximoVencimiento()
    });
  },

  _respuestaSesionPago(data) {
    const qrData = {
      tipo: 'YAPE_QR',
      codigoPago: data.codigoPago,
      monto: data.monto,
      descripcion: data.descripcion,
      edificio: data.edificio.nombre,
      planActual: data.planActual,
      planDestino: data.planDestino,
      operacion: data.operacion,
      qrData: `YAPE|${data.codigoPago}|${data.monto}|${data.descripcion}`
    };

    return {
      mensaje: 'Sesión de pago iniciada. Confirma con tokenPago tras pagar.',
      tokenPago: data.tokenPago,
      codigoPago: data.codigoPago,
      monto: data.monto,
      moneda: 'PEN',
      operacion: data.operacion,
      planActual: data.planActual,
      planDestino: data.planDestino,
      edificio: { id: data.edificio.id, nombre: data.edificio.nombre },
      datosPago: qrData,
      proximoVencimiento: data.proximoVencimiento,
      diasRestantesVencimiento: data.diasRestantesVencimiento ?? null,
      diasGracia: data.diasGracia ?? suscripcionUtil.DIAS_GRACIA_SUSCRIPCION,
      expiraEnMinutos: 30
    };
  },

  /**
   * PASO 2 — Confirma pago, emite boleta, extiende suscripción mensual y notifica.
   */
  async confirmarPagoSuscripcion(tokenPago, propietarioId) {
    let payload;

    try {
      payload = jwt.verify(tokenPago, process.env.JWT_SECRET);
    } catch {
      throw new Error('Sesión de pago expirada o inválida. Inicia el pago nuevamente.');
    }

    if (payload.tipo !== 'PAGO_SUSCRIPCION' || payload.propietarioId !== propietarioId) {
      throw new Error('Sesión de pago no autorizada');
    }

    const edificio = await edificiosRepository.findById(payload.edificioId);
    if (!edificio || edificio.propietarioId !== propietarioId) {
      throw new Error('No tienes permiso para confirmar este pago');
    }

    const boletaExistente = await prisma.factura.findUnique({
      where: { codigoPago: payload.codigoPago }
    });
    if (boletaExistente) {
      throw new Error('Este pago ya fue procesado. Descarga tu boleta en el historial.');
    }

    const verificacion = await this.simularVerificacionPasarela({
      codigoPago: payload.codigoPago,
      monto: payload.monto,
      edificioId: payload.edificioId
    });

    if (!verificacion.aprobado) {
      throw new Error('El pago no fue aprobado por la pasarela');
    }

    const ahora = new Date();
    const nuevaFechaFin = suscripcionUtil.calcularProximoVencimiento(ahora);

    const resultado = await prisma.$transaction(async (tx) => {
      const boleta = await tx.factura.create({
        data: {
          edificioId: payload.edificioId,
          descripcion: `Boleta - ${payload.descripcion}`,
          monto: payload.monto,
          fechaVencimiento: nuevaFechaFin,
          fechaPago: ahora,
          estado: 'PAGADA',
          codigoPago: payload.codigoPago,
          metodoPago: verificacion.metodoPago
        }
      });

      const suscripcionActualizada = await tx.suscripcion.update({
        where: { edificioId: payload.edificioId },
        data: {
          planId: payload.planDestinoId,
          fechaInicio: ahora,
          fechaFin: nuevaFechaFin,
          diasGracia: suscripcionUtil.DIAS_GRACIA_SUSCRIPCION,
          activa: true
        },
        include: { plan: true, edificio: true }
      });

      const accionAuditoria =
        payload.operacion === 'UPGRADE' ? 'UPGRADE_PLAN_PAGADO' : 'RENOVACION_SUSCRIPCION_PAGADA';

      await tx.auditoria.create({
        data: {
          edificioId: payload.edificioId,
          accion: accionAuditoria,
          descripcion:
            `Suscripción ${payload.nuevoPlan} (${payload.operacion}). Pago ${payload.codigoPago}. ` +
            `Vence: ${nuevaFechaFin.toISOString().split('T')[0]}. Boleta: ${boleta.id}`
        }
      });

      return { boleta, suscripcion: suscripcionActualizada, verificacion };
    });

    const urlBoleta = `/api/pagos/boletas/comprobante/${resultado.boleta.id}/descargar`;

    // Propietario: comprobante disponible
    await notificacionesService.crearNotificacion(
      propietarioId,
      'SUSCRIPCION_PAGADA',
      '✅ Pago de suscripción confirmado',
      `Tu pago del plan ${payload.nuevoPlan} para ${edificio.nombre} fue registrado. ` +
        `Próximo vencimiento: ${nuevaFechaFin.toLocaleDateString('es-PE')}.`,
      urlBoleta,
      { boletaId: resultado.boleta.id, edificioId: payload.edificioId }
    );

    // Administradores: heredan el plan del edificio (misma fila Suscripcion por edificioId)
    await notificacionesService.notificarAdministradoresEdificio(
      payload.edificioId,
      'PLAN_EDIFICIO_ACTUALIZADO',
      '📦 Plan del edificio actualizado',
      `El edificio ${edificio.nombre} tiene plan ${payload.nuevoPlan} activo hasta ` +
        `${nuevaFechaFin.toLocaleDateString('es-PE')} tras el pago del propietario.`,
      null,
      { plan: payload.nuevoPlan, fechaFin: nuevaFechaFin }
    );

    return {
      mensaje:
        payload.operacion === 'UPGRADE'
          ? `Plan ${payload.nuevoPlan} activado correctamente`
          : `Renovación mensual del plan ${payload.nuevoPlan} confirmada`,
      boleta: resultado.boleta,
      urlDescargaBoleta: urlBoleta,
      suscripcion: {
        ...resultado.suscripcion,
        fechaFin: nuevaFechaFin,
        diasGracia: suscripcionUtil.DIAS_GRACIA_SUSCRIPCION
      },
      pago: {
        codigoPago: payload.codigoPago,
        monto: payload.monto,
        metodoPago: verificacion.metodoPago,
        referenciaPasarela: verificacion.referenciaPasarela
      },
      limitesActivados: {
        maxUnidades: resultado.suscripcion.plan.maxUnidades,
        permiteIaPlacas: resultado.suscripcion.plan.permiteIaPlacas,
        permiteMetricasAvanzadas: resultado.suscripcion.plan.permiteMetricasAvanzadas
      }
    };
  },

  /** Alias para compatibilidad con edificios/upgrade-plan */
  async confirmarUpgradePlan(tokenPago, propietarioId) {
    return this.confirmarPagoSuscripcion(tokenPago, propietarioId);
  },

  /**
   * Estado de suscripción de un edificio (vencimiento, gracia, plan).
   */
  async obtenerEstadoSuscripcion(edificioId, propietarioId) {
    const edificio = await edificiosRepository.findById(edificioId);
    if (!edificio || edificio.propietarioId !== propietarioId) {
      throw new Error('No tienes permiso para ver esta suscripción');
    }

    const sub = edificio.suscripcion;
    if (!sub) {
      return { plan: 'GRATUITO', activa: false };
    }

    const diasRestantes = suscripcionUtil.diasHasta(sub.fechaFin);
    const diasGracia = sub.diasGracia ?? suscripcionUtil.DIAS_GRACIA_SUSCRIPCION;
    const enGracia = diasRestantes < 0 && Math.abs(diasRestantes) <= diasGracia;
    const vencidaSinGracia = diasRestantes < -diasGracia;

    return {
      plan: sub.plan.nombre,
      precioMensual: Number(sub.plan.precioMensual),
      fechaInicio: sub.fechaInicio,
      fechaVencimiento: sub.fechaFin,
      diasRestantes,
      diasGracia,
      enGracia,
      vencidaSinGracia,
      activa: sub.activa,
      requierePagoMensual: suscripcionUtil.requierePagoMensual(sub.plan.nombre)
    };
  },

  /**
   * Degradar a Gratuito tras agotar días de gracia (job diario).
   */
  async aplicarDegradacionPorImpago(edificioId) {
    const planGratuito = await planesRepository.findByName('GRATUITO');
    if (!planGratuito) {
      throw new Error('Plan GRATUITO no configurado');
    }

    const edificio = await edificiosRepository.findById(edificioId);
    if (!edificio?.suscripcion) return null;

    const planAnterior = edificio.suscripcion.plan.nombre;
    if (planAnterior === 'GRATUITO') return null;

    const nuevaFechaFin = suscripcionUtil.calcularProximoVencimiento();

    const suscripcion = await prisma.suscripcion.update({
      where: { edificioId },
      data: {
        planId: planGratuito.id,
        activa: true,
        fechaFin: nuevaFechaFin,
        diasGracia: suscripcionUtil.DIAS_GRACIA_SUSCRIPCION
      },
      include: { plan: true }
    });

    await prisma.auditoria.create({
      data: {
        edificioId,
        accion: 'SUSCRIPCION_DEGRADADA',
        descripcion: `Plan degradado de ${planAnterior} a GRATUITO por impago tras agotar días de gracia`
      }
    });

    await notificacionesService.crearNotificacion(
      edificio.propietarioId,
      'SUSCRIPCION_DEGRADADA',
      '⚠️ Suscripción degradada por impago',
      `El edificio ${edificio.nombre} volvió al plan Gratuito. Renueva el pago para recuperar ${planAnterior}.`,
      null,
      { edificioId, planAnterior }
    );

    await notificacionesService.notificarAdministradoresEdificio(
      edificioId,
      'PLAN_EDIFICIO_DEGRADADO',
      '⚠️ Plan del edificio reducido',
      `El edificio ${edificio.nombre} está en plan Gratuito por vencimiento de suscripción. ` +
        `Funciones limitadas hasta que el propietario renueve.`,
      null,
      { planAnterior }
    );

    return suscripcion;
  },

  async obtenerBoletasEdificio(edificioId, propietarioId, filtros = {}) {
    const edificio = await edificiosRepository.findById(edificioId);
    if (!edificio || edificio.propietarioId !== propietarioId) {
      throw new Error('No tienes permiso para ver las boletas de este edificio');
    }

    const where = { edificioId, estado: 'PAGADA' };

    if (filtros.fechaDesde) {
      where.fechaPago = { ...where.fechaPago, gte: new Date(filtros.fechaDesde) };
    }
    if (filtros.fechaHasta) {
      where.fechaPago = { ...where.fechaPago, lte: new Date(filtros.fechaHasta) };
    }

    return await prisma.factura.findMany({
      where,
      include: { edificio: { select: { nombre: true } } },
      orderBy: { fechaPago: 'desc' }
    });
  },

  /**
   * Descargar boleta en PDF (propietario del edificio).
   */
  async descargarBoletaPDF(boletaId, propietarioId) {
    const boleta = await prisma.factura.findUnique({
      where: { id: boletaId },
      include: {
        edificio: {
          include: {
            suscripcion: { include: { plan: true } }
          }
        }
      }
    });

    if (!boleta || boleta.estado !== 'PAGADA') {
      throw new Error('Comprobante no encontrado');
    }
    if (boleta.edificio.propietarioId !== propietarioId) {
      throw new Error('No tienes permiso para descargar este comprobante');
    }

    const html = generarHTMLBoleta(
      boleta,
      boleta.edificio,
      boleta.edificio.suscripcion?.plan?.nombre
    );

    const filename = `boleta-${boleta.codigoPago}.pdf`;
    return await reportesService.generarPDF(html, filename);
  },

  async obtenerEstadisticasPagos(edificioId, propietarioId) {
    const edificio = await edificiosRepository.findById(edificioId);
    if (!edificio || edificio.propietarioId !== propietarioId) {
      throw new Error('No tienes permiso para ver estadísticas de este edificio');
    }

    const baseWhere = { edificioId, estado: 'PAGADA' };

    const [totalBoletas, ingresosTotales] = await Promise.all([
      prisma.factura.count({ where: baseWhere }),
      prisma.factura.aggregate({ where: baseWhere, _sum: { monto: true } })
    ]);

    const suscripcion = await planLimitsUtil.obtenerSuscripcionEdificio(edificioId);
    const estado = suscripcion
      ? {
          fechaVencimiento: suscripcion.fechaFin,
          diasRestantes: suscripcionUtil.diasHasta(suscripcion.fechaFin),
          diasGracia: suscripcion.diasGracia
        }
      : null;

    return {
      totalBoletas,
      ingresosTotales: ingresosTotales._sum.monto || 0,
      planActual: suscripcion?.plan?.nombre || 'GRATUITO',
      maxUnidades: suscripcion?.plan?.maxUnidades ?? 0,
      permiteMetricasAvanzadas: suscripcion?.plan?.permiteMetricasAvanzadas ?? false,
      suscripcion: estado
    };
  },

  consultarSesionPago(tokenPago) {
    try {
      const payload = jwt.verify(tokenPago, process.env.JWT_SECRET);
      if (payload.tipo !== 'PAGO_SUSCRIPCION') {
        throw new Error('Token no válido');
      }
      return {
        valida: true,
        operacion: payload.operacion,
        edificioId: payload.edificioId,
        planDestino: payload.nuevoPlan,
        monto: payload.monto,
        codigoPago: payload.codigoPago,
        descripcion: payload.descripcion
      };
    } catch {
      return { valida: false, mensaje: 'Sesión expirada o inválida' };
    }
  },

  /**
   * Actualizar registros viejos de suscripciones en BD.
   * Busca suscripciones con fechaFin mayor a 1 año y las actualiza a la fecha actual.
   * Esto corrige datos de prueba o migraciones antiguas.
   * Ejecutar una vez o cuando se detecten datos inconsistentes.
   */
  async actualizarRegistrosViejosSuscripciones() {
    try {
      console.log('🔄 Buscando suscripciones con fechaFin mayor a 1 año...');

      const fechaLimite = new Date();
      fechaLimite.setFullYear(fechaLimite.getFullYear() + 1);

      const suscripcionesViejas = await prisma.suscripcion.findMany({
        where: {
          fechaFin: {
            gt: fechaLimite
          },
          activa: true
        },
        include: {
          edificio: {
            select: {
              id: true,
              nombre: true,
              propietarioId: true
            }
          },
          plan: true
        }
      });

      if (suscripcionesViejas.length === 0) {
        console.log('✅ No se encontraron suscripciones viejas para actualizar.');
        return { actualizadas: 0, mensaje: 'No se encontraron suscripciones viejas' };
      }

      let contadorActualizadas = 0;

      for (const sub of suscripcionesViejas) {
        const nuevaFechaFin = suscripcionUtil.calcularProximoVencimiento();

        await prisma.suscripcion.update({
          where: { edificioId: sub.edificio.id },
          data: {
            fechaInicio: new Date(),
            fechaFin: nuevaFechaFin,
            diasGracia: suscripcionUtil.DIAS_GRACIA_SUSCRIPCION
          }
        });

        // Registrar en auditoría
        await prisma.auditoria.create({
          data: {
            edificioId: sub.edificio.id,
            accion: 'SUSCRIPCION_ACTUALIZADA_REGISTRO_VIEJO',
            descripcion: `Suscripción del edificio ${sub.edificio.nombre} actualizada por registro viejo. ` +
              `FechaFin anterior: ${sub.fechaFin.toISOString().split('T')[0]}, ` +
              `FechaFin nueva: ${nuevaFechaFin.toISOString().split('T')[0]}`
          }
        });

        contadorActualizadas++;
        console.log(`✅ Suscripción actualizada: ${sub.edificio.nombre}`);
      }

      console.log(`✅ Total de suscripciones actualizadas: ${contadorActualizadas}`);
      return {
        actualizadas: contadorActualizadas,
        mensaje: `Se actualizaron ${contadorActualizadas} suscripciones viejas`
      };
    } catch (error) {
      console.error('❌ Error actualizando registros viejos de suscripciones:', error);
      throw new Error('Error al actualizar registros viejos de suscripciones');
    }
  }
};

module.exports = pagosService;
