const usuariosRepository = require('../usuarios/usuarios.repository');
const rolesRepository = require('../../shared/utils/roles.repository');
const { hashPassword, comparePassword } = require('../../shared/utils/password');
const { generarToken } = require('../../shared/utils/jwt');

/**
 * Auth Service - Registro y Login respetando todos los campos de tu BD
 */
const authService = {

  /**
   * Registro de Propietario
   * Usa todos los campos que tienes en la tabla usuarios
   */
  async register(data) {
    const {
      nombres,
      apellidos,
      email,
      password,
      dni,
      telefono,
      direccion,
      tipoDocumento = 'DNI'
    } = data;

    // Buscar rol PROPIETARIO (obligatorio según tu BD)
    const rol = await rolesRepository.findByName('PROPIETARIO');
    if (!rol) {
      throw new Error('Rol PROPIETARIO no encontrado. Verifica que los datos iniciales estén insertados en la BD.');
    }

    // Verificar si el email ya existe
    const existe = await usuariosRepository.findByEmail(email);
    if (existe) {
      throw new Error('El email ya está registrado');
    }

    // Hashear contraseña
    const passwordHash = await hashPassword(password);

    // Crear usuario con TODOS los campos de tu modelo
    const nuevoUsuario = await usuariosRepository.create({
      rolId: rol.id,
      nombres,
      apellidos,
      tipoDocumento,
      dni,
      email,
      passwordHash,
      telefono,
      direccion
    });

    // Generar token JWT
    const token = generarToken({
      id: nuevoUsuario.id,
      email: nuevoUsuario.email,
      rol: nuevoUsuario.rol.nombre
    });

    // Eliminar passwordHash antes de devolver
    const { passwordHash: _, ...usuarioRespuesta } = nuevoUsuario;

    return {
      usuario: usuarioRespuesta,
      token
    };
  },

  /**
   * Login (funciona para todos los roles)
   */
  async login(email, password) {
    const usuario = await usuariosRepository.findByEmail(email);
    if (!usuario) throw new Error('Credenciales incorrectas');

    const esValido = await comparePassword(password, usuario.passwordHash);
    if (!esValido) throw new Error('Credenciales incorrectas');

    // Preparar datos adicionales según el rol - solo si es necesario
    let datosAdicionales = {};
    
    // Solo cargar relaciones adicionales si es ADMINISTRADOR, PROPIETARIO o INQUILINO
    if (usuario.rol.nombre === 'ADMINISTRADOR') {
      const usuarioConAdmins = await usuariosRepository.findById(usuario.id);
      if (usuarioConAdmins.administradores?.length > 0) {
        const adminsActivos = usuarioConAdmins.administradores.filter(admin => admin.activo);
        datosAdicionales.edificiosIds = adminsActivos.map(admin => admin.edificioId);
        if (adminsActivos.length > 0) {
          datosAdicionales.edificioId = adminsActivos[0].edificioId;
          // Incluir detalles del edificio si está disponible
          if (adminsActivos[0].edificio) {
            datosAdicionales.edificios = [adminsActivos[0].edificio];
          }
        }
      }
    } else if (usuario.rol.nombre === 'PROPIETARIO') {
      const usuarioConEdificios = await usuariosRepository.findById(usuario.id);
      if (usuarioConEdificios.edificios?.length > 0) {
        datosAdicionales.edificiosIds = usuarioConEdificios.edificios.map(edificio => edificio.id);
        datosAdicionales.edificioId = usuarioConEdificios.edificios[0].id;
        // Incluir detalles de los edificios
        datosAdicionales.edificios = usuarioConEdificios.edificios;
      }
    } else if (usuario.rol.nombre === 'INQUILINO') {
      const inquilinosRepository = require('../inquilinos/inquilinos.repository');
      const inquilino = await inquilinosRepository.findByUsuarioId(usuario.id);
      if (inquilino?.unidad?.edificioId) {
        datosAdicionales.edificioId = inquilino.unidad.edificioId;
        datosAdicionales.edificiosIds = [inquilino.unidad.edificioId];
        // Incluir detalles completos del inquilino con unidad
        datosAdicionales.inquilino = inquilino;
      }
    }

    const token = generarToken({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre
    });

    const { passwordHash: _, ...usuarioRespuesta } = usuario;

    return {
      usuario: { ...usuarioRespuesta, ...datosAdicionales },
      token
    };
  }
};

module.exports = authService;
