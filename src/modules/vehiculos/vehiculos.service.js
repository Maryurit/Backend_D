const vehiculosRepository = require("./vehiculos.repository");
const inquilinosRepository = require("../inquilinos/inquilinos.repository");
const auditoriaRepository = require("../auditoria/auditoria.repository");

/**
 * Vehiculos Service
 */
const vehiculosService = {

  async createVehiculo(data, inquilinoId, edificioId, adminId) {
    const inquilino = await inquilinosRepository.findById(inquilinoId);
    if (!inquilino || inquilino.unidad.edificioId !== edificioId) {
      throw new Error('El inquilino no pertenece a este edificio');
    }

    const existePlaca = await vehiculosRepository.findByPlaca(data.placa);
    if (existePlaca) {
      throw new Error('La placa ya está registrada');
    }

    const vehiculo = await vehiculosRepository.create(data, inquilinoId);

    await auditoriaRepository.create(
      adminId,
      edificioId,
      'CREAR_VEHICULO',
      `Vehículo con placa ${data.placa.toUpperCase()} asignado a inquilino`
    );

    return vehiculo;
  },

  async listarVehiculos(edificioId) {
    return await vehiculosRepository.findByEdificio(edificioId);
  },

  async listarVehiculosPorInquilino(inquilinoId, edificioId) {
    return await vehiculosRepository.findByInquilino(inquilinoId, edificioId);
  },

  async obtenerVehiculo(id, edificioId, rol, usuarioId) {
    const vehiculo = await vehiculosRepository.findById(id);
    if (!vehiculo) {
      throw new Error('Vehículo no encontrado');
    }

    // Verificar que el vehículo pertenezca al edificio
    if (vehiculo.inquilino?.unidad?.edificioId !== edificioId) {
      throw new Error('Vehículo no encontrado en este edificio');
    }

    // Si es INQUILINO, verificar que el vehículo le pertenezca
    if (rol === 'INQUILINO') {
      const inquilino = await inquilinosRepository.findByUsuarioId(usuarioId);
      if (!inquilino || vehiculo.inquilinoId !== inquilino.id) {
        throw new Error('No tienes permiso para ver este vehículo');
      }
    }

    return vehiculo;
  },

  async updateVehiculo(id, data, edificioId, adminId) {
    const vehiculoActual = await vehiculosRepository.findById(id);
    if (!vehiculoActual || vehiculoActual.inquilino.unidad.edificioId !== edificioId) {
      throw new Error('Vehículo no encontrado en este edificio');
    }

    if (data.placa && data.placa.toUpperCase() !== vehiculoActual.placa) {
      const placaExistente = await vehiculosRepository.findByPlaca(data.placa);
      if (placaExistente) {
        throw new Error('La placa ya está en uso');
      }
    }

    const vehiculo = await vehiculosRepository.update(id, data);
    await auditoriaRepository.create(adminId, edificioId, 'ACTUALIZAR_VEHICULO', `Vehículo actualizado`);
    return vehiculo;
  },

  async toggleActivo(id, edificioId, adminId) {
    const vehiculoActual = await vehiculosRepository.findById(id);
    if (!vehiculoActual || vehiculoActual.inquilino.unidad.edificioId !== edificioId) {
      throw new Error('Vehículo no encontrado en este edificio');
    }

    const vehiculo = await vehiculosRepository.toggleActivo(id);
    await auditoriaRepository.create(adminId, edificioId, 'TOGGLE_VEHICULO', `Vehículo ${vehiculo.activo ? 'activado' : 'desactivado'}`);
    return vehiculo;
  },

  async deleteVehiculo(id, edificioId, adminId) {
    const vehiculoActual = await vehiculosRepository.findById(id);
    if (!vehiculoActual || vehiculoActual.inquilino.unidad.edificioId !== edificioId) {
      throw new Error('Vehículo no encontrado en este edificio');
    }

    const vehiculo = await vehiculosRepository.delete(id);
    await auditoriaRepository.create(adminId, edificioId, 'ELIMINAR_VEHICULO', `Vehículo con placa ${vehiculo.placa} eliminado`);
    return vehiculo;
  }
};

module.exports = vehiculosService;