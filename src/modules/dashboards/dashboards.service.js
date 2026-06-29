const prisma = require("../../shared/config/database");

/**
 * Dashboard Service - Métricas e indicadores para usuarios
 */
const dashboardService = {

async getDashboardInquilino(usuarioId) {
  const inquilino = await prisma.inquilino.findFirst({
    where: { usuarioId },
    include: {
      unidad: true
    }
  });

  if (!inquilino) {
    throw new Error('Inquilino no encontrado');
  }

  const vehiculos = await prisma.vehiculo.findMany({
    where: { inquilinoId: inquilino.id }
  });

  const accesos = await prisma.historialAcceso.findMany({
    where: {
      vehiculo: { inquilinoId: inquilino.id }
    },
    take: 10,
    orderBy: { fechaEvento: 'desc' }
  });

  return {
    estadisticas: {
      vehiculos: vehiculos.length,
      unidad: inquilino.unidad.numero,
      contratoActivo: inquilino.estadoContrato === 'ACTIVO'
    },
    ultimosAccesos: accesos,
    alertasRecientes: []
  };
},





  /**
   * Dashboard del Propietario - Vista general de todos sus edificios
   */
  async getDashboardPropietario(propietarioId) {
    try {
      // Obtener todos los edificios del propietario
      const edificios = await prisma.edificio.findMany({
        where: { propietarioId },
        include: {
          suscripcion: {
            include: { plan: true }
          },
          _count: {
            select: {
              unidades: true,
              camaras: true,
              alertas: {
                where: { atendida: false }
              }
            }
          }
        }
      });









      
      const edificioIds = edificios.map(e => e.id);

      // Estadísticas generales
      const [totalInquilinos, totalVehiculos, accesosRecientes, alertasActivas] = await Promise.all([
        // Total de inquilinos
        prisma.inquilino.count({
          where: {
            unidad: {
              edificioId: { in: edificioIds }
            }
          }
        }),

        // Total de vehículos
        prisma.vehiculo.count({
          where: {
            inquilino: {
              unidad: {
                edificioId: { in: edificioIds }
              }
            }
          }
        }),

        // Accesos de las últimas 7 días
        prisma.historialAcceso.findMany({
          where: {
            edificioId: { in: edificioIds },
            fechaEvento: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          include: {
            edificio: { select: { nombre: true } },
            vehiculo: {
              include: {
                inquilino: {
                  include: {
                    usuario: { select: { nombres: true, apellidos: true } }
                  }
                }
              }
            }
          },
          orderBy: { fechaEvento: 'desc' },
          take: 10
        }),

        // Alertas activas
        prisma.alerta.findMany({
          where: {
            edificioId: { in: edificioIds },
            atendida: false
          },
          include: {
            edificio: { select: { nombre: true } }
          },
          orderBy: { fechaCreacion: 'desc' },
          take: 5
        })
      ]);

      // Resumen por edificio
      const resumenEdificios = edificios.map(edificio => ({
        id: edificio.id,
        nombre: edificio.nombre,
        plan: edificio.suscripcion?.plan.nombre || 'SIN PLAN',
        unidades: edificio._count.unidades,
        camaras: edificio._count.camaras,
        alertasActivas: edificio._count.alertas,
        estado: edificio.activo ? 'ACTIVO' : 'INACTIVO'
      }));

      return {
        estadisticasGenerales: {
          totalEdificios: edificios.length,
          totalInquilinos,
          totalVehiculos,
          totalAlertasActivas: alertasActivas.length
        },
        accesosRecientes,
        alertasActivas,
        resumenEdificios
      };

    } catch (error) {
      console.error('Error obteniendo dashboard propietario:', error);
      throw new Error('Error al cargar dashboard del propietario');
    }
  },

  /**
   * Dashboard del Administrador - Vista de su edificio asignado
   */
  async getDashboardAdministrador(administradorId, edificioId) {
    try {
      // Verificar que el administrador tenga acceso al edificio
      const adminEdificio = await prisma.administrador.findFirst({
        where: {
          usuarioId: administradorId,
          edificioId: edificioId,
          activo: true
        }
      });

      if (!adminEdificio) {
        throw new Error('No tienes acceso a este edificio');
      }

      // Estadísticas del edificio
      const [estadisticas, accesosHoy, alertasPendientes, inquilinosActivos, ultimoInquilino] = await Promise.all([
        // Estadísticas básicas
        Promise.all([
          prisma.unidad.count({ where: { edificioId } }),
          prisma.camara.count({ where: { edificioId, activa: true } }),
          prisma.vehiculo.count({
            where: {
              inquilino: {
                unidad: { edificioId }
              }
            }
          })
        ]).then(([unidades, camaras, vehiculos]) => ({
          unidades,
          camaras,
          vehiculos
        })),

        // Accesos del día actual
        prisma.historialAcceso.findMany({
          where: {
            edificioId,
            fechaEvento: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          },
          include: {
            vehiculo: {
              include: {
                inquilino: {
                  include: {
                    usuario: { select: { nombres: true, apellidos: true } },
                    unidad: { select: { numero: true } }
                  }
                }
              }
            }
          },
          orderBy: { fechaEvento: 'desc' }
        }),

        // Alertas pendientes
        prisma.alerta.findMany({
          where: {
            edificioId,
            atendida: false
          },
          orderBy: { fechaCreacion: 'desc' },
          take: 10
        }),

        // Inquilinos activos
        prisma.inquilino.findMany({
          where: {
            unidad: { edificioId },
            estadoContrato: 'ACTIVO'
          },
          include: {
            usuario: { select: { nombres: true, apellidos: true } },
            unidad: { select: { numero: true } }
          },
          take: 10
        }),

      // Último inquilino creado
        prisma.inquilino.findFirst({
          where: {
            unidad: { edificioId }
          },
          include: {
            usuario: { select: { nombres: true, apellidos: true, email: true } },
            unidad: { select: { numero: true, piso: true } }
          },
          orderBy: { createdAt: 'desc' }
        }).catch(() => null)
      ]);

      // Eventos recientes (últimas 7 días)
      let eventosRecientes = [];
      try {
        eventosRecientes = await prisma.historialAcceso.findMany({
          where: {
            edificioId,
            fechaEvento: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          include: {
            vehiculo: {
              include: {
                inquilino: {
                  include: {
                    usuario: { select: { nombres: true, apellidos: true } }
                  }
                }
              }
            }
          },
          orderBy: { fechaEvento: 'desc' },
          take: 20
        });
      } catch (error) {
        console.error('Error fetching eventosRecientes:', error);
        // Continue with empty array if query fails
      }

      return {
        estadisticas,
        accesosHoy: accesosHoy.length,
        alertasPendientes: alertasPendientes.length,
        inquilinosActivos: inquilinosActivos.length,
        eventosRecientes,
        alertasPendientes,
        inquilinosRecientes: inquilinosActivos,
        ultimoInquilino
      };

    } catch (error) {
      console.error('Error obteniendo dashboard administrador:', error);
      throw new Error('Error al cargar dashboard del administrador');
    }
  }
};

module.exports = dashboardService;