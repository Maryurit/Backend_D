const usuariosRepository = require("./usuarios.repository");
const rolesRepository = require("../../shared/utils/roles.repository");
const { hashPassword } = require("../../shared/utils/password");

/**
 * Usuarios Service - Crear y listar Administradores (solo Propietario)
 */
const usuariosService = {

  /**
   * Crear un nuevo Administrador
   */
  async createAdmin(data) {
    const rolAdmin = await rolesRepository.findByName('ADMINISTRADOR');
    if (!rolAdmin) {
      throw new Error('Rol ADMINISTRADOR no encontrado');
    }

    const existe = await usuariosRepository.findByEmail(data.email);
    if (existe) {
      throw new Error('El email ya está registrado');
    }

    const passwordHash = await hashPassword(data.password);

    const nuevoAdmin = await usuariosRepository.createAdmin({
      rolId: rolAdmin.id,
      nombres: data.nombres,
      apellidos: data.apellidos,
      email: data.email,
      passwordHash,
      dni: data.dni,
      telefono: data.telefono,
      direccion: data.direccion,
      tipoDocumento: data.tipoDocumento || 'DNI'
    });

    return nuevoAdmin;
  },

  /**
   * Listar todos los administradores
   */
  async listarAdministradores() {
    return await usuariosRepository.findByRol('ADMINISTRADOR');
  },

  async updateAdmin(id, data) {
    return await usuariosRepository.update(id, data);
  },

  async deleteAdmin(id) {
    return await usuariosRepository.delete(id);
  },

  /**
   * Crear un nuevo usuario con rol INQUILINO (usado por el Administrador)
   * Valida email y DNI únicos antes de crear
   */
  async createInquilinoUsuario(data) {
    const rolInquilino = await rolesRepository.findByName('INQUILINO');
    if (!rolInquilino) {
      throw new Error('Rol INQUILINO no encontrado');
    }

    // Validar email único
    const existeEmail = await usuariosRepository.findByEmail(data.email);
    if (existeEmail) {
      throw new Error('El email ya está registrado en el sistema');
    }

    // Validar DNI único si se proporciona
    if (data.dni) {
      const existeDni = await usuariosRepository.findByDni(data.dni);
      if (existeDni) {
        throw new Error('El DNI ya está registrado en el sistema');
      }
    }

    // Crear contraseña temporal basada en datos personales si no se proporciona
    const passwordDefault = `${data.dni || data.email.split('@')[0]}Temp123!`;
    const passwordHash = await hashPassword(data.password || passwordDefault);

    const nuevoUsuario = await usuariosRepository.create({
      rolId: rolInquilino.id,
      nombres: data.nombres,
      apellidos: data.apellidos,
      email: data.email,
      passwordHash,
      dni: data.dni || null,
      telefono: data.telefono || null,
      direccion: data.direccion || null,
      tipoDocumento: data.tipoDocumento || 'DNI'
    });

    return nuevoUsuario;
  }
};

module.exports = usuariosService;