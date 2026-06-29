const prisma = require('../../shared/config/database');
const auditoriaRepository = require("../auditoria/auditoria.repository");
const notificacionesService = require('../notificaciones/notificaciones.service');

/**
 * Accesos Service - Recibe placas desde el script Python
 */
const accesosService = {

  async registrarDesdeIA(placaDetectada, camaraId) {
    const camara = await prisma.camara.findUnique({
      where: { id: camaraId }
    });

    if (!camara) throw new Error('Cámara no encontrada');

    const edificioId = camara.edificioId;

    const placaOriginal = placaDetectada.toUpperCase().trim();
    const placaSinGuion = placaOriginal.replace(/[- ]/g, '');
    const placaConGuion = placaSinGuion.replace(/(.{3})(.{3})/, '$1-$2');

    let vehiculo = null;

    const posiblesPlacas = [placaOriginal, placaSinGuion, placaConGuion];

    for (const placa of posiblesPlacas) {
      vehiculo = await prisma.vehiculo.findFirst({
        where: { 
          placa: placa,
          inquilino: {
            unidad: {
              edificioId: edificioId  // ✅ Filtrar por edificio
            }
          }
        },
        include: {
          inquilino: {
            include: {
              unidad: true,
              usuario: {
                select: { nombres: true, apellidos: true, email: true }
              }
            }
          }
        }
      });
      if (vehiculo) break;
    }

    let resultado = 'NO_IDENTIFICADO';
    let infoExtra = '';

    if (vehiculo) {
      resultado = vehiculo.activo ? 'AUTORIZADO' : 'NO_AUTORIZADO';
      infoExtra = ` | Dueño: ${vehiculo.inquilino?.usuario ? 
        `${vehiculo.inquilino.usuario.nombres} ${vehiculo.inquilino.usuario.apellidos}` : 'Sin inquilino'} 
        | Carro: ${vehiculo.modelo || ''} ${vehiculo.color || ''}`;
    }

    // Guardar historial
    const historial = await prisma.historialAcceso.create({
      data: {
        edificioId,
        camaraId,
        vehiculoId: vehiculo ? vehiculo.id : null,
        tipo: 'PLACA',
        resultado,
        placa: placaOriginal,
        nivelConfianza: 82
      }
    });

    // Registrar en auditoría
    await auditoriaRepository.create(
      null,
      edificioId,
      'DETECCION_PLACA',
      `Placa: ${placaOriginal} → ${resultado}${infoExtra}`
    );

    // Notificar propietario y administradores del edificio
    const tipoNotificacion = resultado === 'AUTORIZADO'
      ? 'ACCESO_AUTORIZADO'
      : resultado === 'NO_AUTORIZADO'
        ? 'ACCESO_NO_AUTORIZADO'
        : 'ACCESO_NO_IDENTIFICADO';

    const tituloNotificacion = resultado === 'AUTORIZADO'
      ? 'Vehículo autorizado'
      : resultado === 'NO_AUTORIZADO'
        ? 'Vehículo no autorizado'
        : 'Acceso no identificado';

    const mensajeNotificacion = `Cámara ${camara.nombre}: placa ${placaOriginal} ${resultado === 'AUTORIZADO' ? 'autorizada' : resultado === 'NO_AUTORIZADO' ? 'no autorizada' : 'no identificada'}.`;

    await notificacionesService.crearNotificacionesParaEdificio(
      edificioId,
      tipoNotificacion,
      tituloNotificacion,
      mensajeNotificacion,
      `/camaras/${camaraId}`,
      {
        camaraId,
        edificioId,
        resultado,
        placa: placaOriginal,
        historialId: historial.id
      }
    );

    console.log(`🚨 Alerta: ${resultado} - Placa: ${placaOriginal}${infoExtra}`);

    return {
      resultado,
      placaOriginal,
      infoExtra: infoExtra.trim(),
      vehiculo: vehiculo ? {
        placa: vehiculo.placa,
        modelo: vehiculo.modelo,
        color: vehiculo.color,
        inquilino: vehiculo.inquilino?.usuario ?
          `${vehiculo.inquilino.usuario.nombres} ${vehiculo.inquilino.usuario.apellidos}` : null
      } : null
    };
  },

  /**
   * Registrar alerta de conducta sospechosa desde IA
   */
  async registrarAlertaSospechosa(camaraId, descripcion) {
    const camara = await prisma.camara.findUnique({
      where: { id: camaraId },
      include: {
        edificio: true
      }
    });

    if (!camara) throw new Error('Cámara no encontrada');

    const edificioId = camara.edificioId;

    // Crear historial de acceso para conducta sospechosa
    const historial = await prisma.historialAcceso.create({
      data: {
        edificioId,
        camaraId,
        tipo: 'PLACA', // Mantener como PLACA para compatibilidad
        resultado: 'NO_IDENTIFICADO', // No es un acceso autorizado
        placa: null,
        nivelConfianza: null
      }
    });

    // Crear alerta de conducta sospechosa
    const alerta = await prisma.alerta.create({
      data: {
        historialId: historial.id,
        edificioId,
        titulo: '🚨 CONDUCTA SOSPECHOSA DETECTADA',
        descripcion: `${descripcion} | Cámara: ${camara.nombre}`,
        nivel: 'CRITICA'
      }
    });

    // Registrar en auditoría
    await auditoriaRepository.create(
      null,
      edificioId,
      'ALERTA_CONDUCTA_SOSPECHOSA',
      `Conducta sospechosa: ${descripcion} | Cámara: ${camara.nombre}`
    );

    // Notificar propietario y administradores del edificio
    await notificacionesService.crearNotificacionesParaEdificio(
      edificioId,
      'ALERTA_SOSPECHOSA',
      '🚨 Conducta sospechosa detectada',
      `Se detectó conducta sospechosa en la cámara ${camara.nombre}: ${descripcion}`,
      `/camaras/${camaraId}`,
      {
        camaraId,
        edificioId,
        alertaId: alerta.id,
        historialId: historial.id
      }
    );

    console.log(`🚨 ALERTA CRÍTICA: Conducta sospechosa detectada - ${descripcion} | Cámara: ${camara.nombre}`);

    return {
      alertaId: alerta.id,
      tipo: 'SOSPECHOSA',
      descripcion,
      camara: camara.nombre,
      edificio: camara.edificio.nombre,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * @param {object} limiteHistorial - Límite por plan desde planValidation.validarHistorial
   */
  async obtenerHistorial(usuario, filtros = {}, limiteHistorial = null) {
    const where = {};

    if (filtros.desde || filtros.hasta) {
      where.fechaEvento = {};
      if (filtros.desde) {
        where.fechaEvento.gte = new Date(filtros.desde);
      }
      if (filtros.hasta) {
        where.fechaEvento.lte = new Date(filtros.hasta);
      }
    }

    // Ventana máxima de historial según plan del edificio (7 / 180 / 365 días)
    if (limiteHistorial?.fechaMinima) {
      if (!where.fechaEvento) where.fechaEvento = {};
      const solicitado = where.fechaEvento.gte;
      where.fechaEvento.gte = solicitado && solicitado > limiteHistorial.fechaMinima
        ? solicitado
        : limiteHistorial.fechaMinima;
    }

    if (filtros.tipo) {
      where.tipo = filtros.tipo;
    }

    if (filtros.resultado) {
      where.resultado = filtros.resultado;
    }

    if (usuario.rol === 'INQUILINO') {
      where.vehiculo = {
        inquilino: {
          usuarioId: usuario.id
        }
      };
    } else if (['ADMINISTRADOR', 'PROPIETARIO'].includes(usuario.rol)) {
      const edificiosIds = usuario.edificiosIds || (usuario.edificioId ? [usuario.edificioId] : []);
      if (filtros.edificioId && edificiosIds.includes(filtros.edificioId)) {
        where.edificioId = filtros.edificioId;
      } else {
        where.edificioId = { in: edificiosIds };
      }
    } else {
      return [];
    }

    return await prisma.historialAcceso.findMany({
      where,
      include: {
        vehiculo: {
          include: {
            inquilino: {
              include: {
                usuario: {
                  select: {
                    id: true,
                    nombres: true,
                    apellidos: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        camara: true,
        alerta: true
      },
      orderBy: { fechaEvento: 'desc' }
    });
  }
};

module.exports = accesosService;