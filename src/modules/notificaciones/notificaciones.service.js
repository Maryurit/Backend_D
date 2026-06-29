const prisma = require("../../shared/config/database");
const suscripcionUtil = require('../../shared/utils/suscripcion.util');

/**
 * Notificaciones Service - Sistema de recordatorios y alertas
 */
const notificacionesService = {

  /**
   * Crear notificación para un usuario
   */
  async crearNotificacion(usuarioId, tipo, titulo, mensaje, url = null, metadatos = null) {
    try {
      const notificacion = await prisma.notificacion.create({
        data: {
          usuarioId,
          tipo,
          titulo,
          mensaje,
          url,
          metadatos: metadatos ? metadatos : null
        }
      });

      return notificacion;
    } catch (error) {
      console.error('Error creando notificación:', error);
      throw new Error('Error al crear notificación');
    }
  },

  /**
   * Notifica solo a administradores activos del edificio (no al propietario).
   */
  async notificarAdministradoresEdificio(edificioId, tipo, titulo, mensaje, url = null, metadatos = null) {
    try {
      const administradores = await prisma.administrador.findMany({
        where: { edificioId, activo: true },
        select: { usuarioId: true }
      });

      const notificaciones = await Promise.all(
        administradores.map((admin) =>
          this.crearNotificacion(admin.usuarioId, tipo, titulo, mensaje, url, metadatos)
        )
      );

      return notificaciones;
    } catch (error) {
      console.error('Error notificando administradores:', error);
      throw new Error('Error al notificar administradores del edificio');
    }
  },

  async crearNotificacionesParaEdificio(edificioId, tipo, titulo, mensaje, url = null, metadatos = null) {
    try {
      const destinatarios = await prisma.usuario.findMany({
        where: {
          OR: [
            {
              rol: {
                nombre: 'PROPIETARIO'
              },
              edificios: {
                some: { id: edificioId }
              }
            },
            {
              rol: {
                nombre: 'ADMINISTRADOR'
              },
              administradores: {
                some: {
                  edificioId: edificioId,
                  activo: true
                }
              }
            }
          ]
        },
        select: {
          id: true
        }
      });

      const notificaciones = await Promise.all(
        destinatarios.map(destinatario =>
          this.crearNotificacion(
            destinatario.id,
            tipo,
            titulo,
            mensaje,
            url,
            metadatos
          )
        )
      );

      return notificaciones;
    } catch (error) {
      console.error('Error creando notificaciones para edificio:', error);
      throw new Error('Error al crear notificaciones para el edificio');
    }
  },

  /**
   * Obtener notificaciones de un usuario
   */
  async obtenerNotificacionesUsuario(usuarioId, soloNoLeidas = false) {
    try {
      const where = { usuarioId };
      if (soloNoLeidas) {
        where.leida = false;
      }

      const notificaciones = await prisma.notificacion.findMany({
        where,
        orderBy: { fechaCreacion: 'desc' },
        take: 50
      });

      return notificaciones;
    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      throw new Error('Error al obtener notificaciones');
    }
  },

  /**
   * Marcar notificación como leída
   */
  async marcarComoLeida(notificacionId, usuarioId) {
    try {
      const notificacion = await prisma.notificacion.updateMany({
        where: {
          id: notificacionId,
          usuarioId: usuarioId
        },
        data: {
          leida: true
        }
      });

      return notificacion.count > 0;
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      throw new Error('Error al marcar notificación como leída');
    }
  },

  /**
   * Evita spam: ¿ya hubo notificación de este tipo en las últimas N horas?
   */
  async _existeNotificacionReciente(usuarioId, tipo, horas = 24) {
    const reciente = await prisma.notificacion.findFirst({
      where: {
        usuarioId,
        tipo,
        fechaCreacion: {
          gte: new Date(Date.now() - horas * 60 * 60 * 1000)
        }
      }
    });
    return !!reciente;
  },

  /**
   * Recordatorios de suscripción mensual al PROPIETARIO (como alquiler/contrato del inquilino).
   * - 3 días antes del vencimiento (fechaFin)
   * - Durante mora (hasta 3 días de gracia tras vencimiento)
   * - Degradación automática si supera la gracia
   * Ejecutar diariamente vía POST /api/notificaciones/mantenimiento
   */
  async generarRecordatoriosSuscripcionPropietario() {
    try {
      console.log('🔄 Recordatorios de suscripción a propietarios...');

      const suscripciones = await prisma.suscripcion.findMany({
        where: { activa: true },
        include: {
          plan: true,
          edificio: {
            select: {
              id: true,
              nombre: true,
              propietarioId: true,
              activo: true
            }
          }
        }
      });

      let avisosPrevios = 0;
      let avisosMora = 0;
      let degradaciones = 0;

      for (const sub of suscripciones) {
        if (!sub.edificio?.activo) continue;
        if (!suscripcionUtil.requierePagoMensual(sub.plan.nombre)) continue;

        const propietarioId = sub.edificio.propietarioId;
        const diasGracia = sub.diasGracia ?? suscripcionUtil.DIAS_GRACIA_SUSCRIPCION;
        const diasRestantes = suscripcionUtil.diasHasta(sub.fechaFin);
        const fechaVenceStr = new Date(sub.fechaFin).toLocaleDateString('es-PE');

        // 3 días antes del vencimiento
        if (diasRestantes === suscripcionUtil.DIAS_AVISO_PREVIO) {
          const ya = await this._existeNotificacionReciente(
            propietarioId,
            'RECORDATORIO_SUSCRIPCION',
            48
          );
          if (!ya) {
            await this.crearNotificacion(
              propietarioId,
              'RECORDATORIO_SUSCRIPCION',
              '💳 Recordatorio: pago de suscripción',
              `Tu suscripción ${sub.plan.nombre} del edificio ${sub.edificio.nombre} vence el ${fechaVenceStr} ` +
                `(en ${diasRestantes} días). Renueva para mantener todas las funciones.`,
              `/edificios`,
              { edificioId: sub.edificio.id, diasRestantes }
            );
            avisosPrevios++;

            // Aviso opcional a administradores 3 días antes del vencimiento
            // Esto permite que el admin empuje al propietario a renovar
            await this.notificarAdministradoresEdificio(
              sub.edificio.id,
              'AVISO_VENCIMIENTO_ADMIN',
              '⏰ Aviso: Suscripción del edificio por vencer',
              `La suscripción ${sub.plan.nombre} del edificio ${sub.edificio.nombre} vence en ${diasRestantes} días. ` +
                `Considera recordar al propietario que renueve para evitar interrupciones del servicio.`,
              `/edificios`,
              { edificioId: sub.edificio.id, diasRestantes, plan: sub.plan.nombre }
            );
          }
        }

        // En mora (vencido pero dentro de gracia)
        if (diasRestantes < 0) {
          const diasRetraso = Math.abs(diasRestantes);

          if (diasRetraso <= diasGracia) {
            const ya = await this._existeNotificacionReciente(
              propietarioId,
              'RECORDATORIO_SUSCRIPCION_MORA',
              24
            );
            if (!ya) {
              await this.crearNotificacion(
                propietarioId,
                'RECORDATORIO_SUSCRIPCION_MORA',
                '⚠️ Suscripción vencida — período de gracia',
                `El pago de ${sub.plan.nombre} para ${sub.edificio.nombre} venció hace ${diasRetraso} día(s). ` +
                  `Tienes ${diasGracia - diasRetraso} día(s) de gracia antes de perder el plan.`,
                `/edificios`,
                { edificioId: sub.edificio.id, diasRetraso, diasGracia }
              );
              avisosMora++;
            }
          } else if (diasRetraso > diasGracia) {
            // require diferido para evitar dependencia circular con pagos.service
            const pagosService = require('../pagos/pagos.service');
            await pagosService.aplicarDegradacionPorImpago(sub.edificio.id);
            degradaciones++;
          }
        }
      }

      console.log(
        `✅ Suscripción: ${avisosPrevios} avisos previos, ${avisosMora} en mora, ${degradaciones} degradaciones`
      );
      return { avisosPrevios, avisosMora, degradaciones };
    } catch (error) {
      console.error('Error en recordatorios de suscripción:', error);
      throw new Error('Error al generar recordatorios de suscripción');
    }
  },

  /**
   * Recordatorios de contratos de inquilinos (no es pago SaaS del edificio).
   */
  async generarRecordatoriosContratos() {
    try {
      console.log('🔄 Generando recordatorios de contratos...');

      // Buscar inquilinos con contratos próximos a vencer (30 días)
      const contratosPorVencer = await prisma.inquilino.findMany({
        where: {
          fechaFinContrato: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
            gte: new Date()
          },
          estadoContrato: 'ACTIVO'
        },
        include: {
          usuario: { select: { id: true, nombres: true, apellidos: true } },
          unidad: {
            include: {
              edificio: { select: { nombre: true } }
            }
          }
        }
      });

      let contadorRecordatorios = 0;

      for (const inquilino of contratosPorVencer) {
        const diasRestantes = Math.ceil(
          (new Date(inquilino.fechaFinContrato) - new Date()) / (1000 * 60 * 60 * 24)
        );

        // Solo enviar recordatorio cada 7 días para no spam
        const recordatorioReciente = await prisma.notificacion.findFirst({
          where: {
            usuarioId: inquilino.usuario.id,
            tipo: 'RECORDATORIO_CONTRATO',
            fechaCreacion: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
            }
          }
        });

        if (!recordatorioReciente) {
          await this.crearNotificacion(
            inquilino.usuario.id,
            'RECORDATORIO_CONTRATO',
            '📅 Recordatorio: Contrato próximo a vencer',
            `Tu contrato en la unidad ${inquilino.unidad.numero} del edificio ${inquilino.unidad.edificio.nombre} vence en ${diasRestantes} días. Considera renovarlo.`
          );
          contadorRecordatorios++;
        }
      }

      console.log(`✅ Generados ${contadorRecordatorios} recordatorios de contratos`);
      return contadorRecordatorios;

    } catch (error) {
      console.error('Error generando recordatorios de pagos:', error);
      throw new Error('Error al generar recordatorios de pagos');
    }
  },

  /**
   * Generar recordatorios de pagos de alquiler
   * Se ejecuta periódicamente (mensual)
   */
  async generarRecordatoriosAlquiler() {
    try {
      console.log('🔄 Generando recordatorios de alquiler...');

      // Obtener fecha actual
      const ahora = new Date();
      const diaActual = ahora.getDate();

      // Recordatorios para inquilinos con pagos próximos (día 25-31 del mes)
      if (diaActual >= 25) {
        const inquilinosActivos = await prisma.inquilino.findMany({
          where: { estadoContrato: 'ACTIVO' },
          include: {
            usuario: { select: { id: true, nombres: true, apellidos: true } },
            unidad: {
              include: {
                edificio: { select: { nombre: true } }
              }
            }
          }
        });

        let contadorRecordatorios = 0;

        for (const inquilino of inquilinosActivos) {
          // Solo enviar recordatorio una vez al mes
          const recordatorioReciente = await prisma.notificacion.findFirst({
            where: {
              usuarioId: inquilino.usuario.id,
              tipo: 'RECORDATORIO_PAGO',
              fechaCreacion: {
                gte: new Date(ahora.getFullYear(), ahora.getMonth(), 1) // Desde inicio de mes
              }
            }
          });

          if (!recordatorioReciente) {
            await this.crearNotificacion(
              inquilino.usuario.id,
              'RECORDATORIO_PAGO',
              '💰 Recordatorio: Pago de alquiler',
              `Recuerda realizar el pago de alquiler correspondiente al mes de ${ahora.toLocaleString('es-ES', { month: 'long', year: 'numeric' })} para la unidad ${inquilino.unidad.numero} del edificio ${inquilino.unidad.edificio.nombre}.`
            );
            contadorRecordatorios++;
          }
        }

        console.log(`✅ Generados ${contadorRecordatorios} recordatorios de alquiler`);
        return contadorRecordatorios;
      }

      return 0;

    } catch (error) {
      console.error('Error generando recordatorios de alquiler:', error);
      throw new Error('Error al generar recordatorios de alquiler');
    }
  },

  /**
   * Notificar administradores sobre solicitudes pendientes
   */
  async notificarSolicitudesPendientes() {
    try {
      console.log('🔄 Verificando solicitudes pendientes...');

      // Obtener administradores con solicitudes pendientes
      const administradoresConSolicitudes = await prisma.administrador.findMany({
        where: { activo: true },
        include: {
          edificio: {
            include: {
              unidades: {
                include: {
                  inquilino: {
                    include: {
                      solicitudes: {
                        where: { estado: 'PENDIENTE' }
                      }
                    }
                  }
                }
              }
            }
          },
          usuario: { select: { id: true, nombres: true, apellidos: true } }
        }
      });

      let contadorNotificaciones = 0;

      for (const admin of administradoresConSolicitudes) {
        const solicitudesPendientes = [];

        // Recopilar solicitudes de todos los inquilinos del edificio
        for (const unidad of admin.edificio.unidades) {
          if (unidad.inquilino && unidad.inquilino.solicitudes.length > 0) {
            solicitudesPendientes.push(...unidad.inquilino.solicitudes);
          }
        }

        if (solicitudesPendientes.length > 0) {
          // Verificar si ya se notificó recientemente
          const notificacionReciente = await prisma.notificacion.findFirst({
            where: {
              usuarioId: admin.usuario.id,
              tipo: 'SOLICITUDES_PENDIENTES',
              fechaCreacion: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
              }
            }
          });

          if (!notificacionReciente) {
            await this.crearNotificacion(
              admin.usuario.id,
              'SOLICITUDES_PENDIENTES',
              '📋 Solicitudes pendientes de revisión',
              `Tienes ${solicitudesPendientes.length} solicitud(es) pendiente(s) de revisión en el edificio ${admin.edificio.nombre}.`
            );
            contadorNotificaciones++;
          }
        }
      }

      console.log(`✅ Generadas ${contadorNotificaciones} notificaciones de solicitudes pendientes`);
      return contadorNotificaciones;

    } catch (error) {
      console.error('Error notificando solicitudes pendientes:', error);
      throw new Error('Error al notificar solicitudes pendientes');
    }
  },

  /**
   * Ejecutar todas las tareas de mantenimiento de notificaciones
   * Se debe llamar periódicamente (diario)
   */
  async ejecutarMantenimientoNotificaciones() {
    try {
      console.log('🔄 Ejecutando mantenimiento de notificaciones...');

      const suscripcion = await this.generarRecordatoriosSuscripcionPropietario();
      const contratos = await this.generarRecordatoriosContratos();
      const alquiler = await this.generarRecordatoriosAlquiler();
      const solicitudes = await this.notificarSolicitudesPendientes();

      const total =
        suscripcion.avisosPrevios +
        suscripcion.avisosMora +
        suscripcion.degradaciones +
        contratos +
        alquiler +
        solicitudes;

      console.log(`✅ Mantenimiento completado: ${total} acciones/notificaciones`);
      return {
        suscripcionPropietario: suscripcion,
        recordatoriosContratos: contratos,
        recordatoriosAlquiler: alquiler,
        notificacionesSolicitudes: solicitudes,
        total
      };

    } catch (error) {
      console.error('Error en mantenimiento de notificaciones:', error);
      throw new Error('Error en mantenimiento de notificaciones');
    }
  }
};

module.exports = notificacionesService;