/**
 * roles.middleware.js
 * Middleware para controlar accesos según rol del usuario
 */

const roleGuard = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos suficientes para esta acción'
      });
    }
    next();
  };
};

/**
 * Middleware específico para Administradores:
 * Verifica que solo pueda gestionar su propio edificio
 */
const adminEdificioGuard = async (req, res, next) => {
  if (req.user.rol !== 'ADMINISTRADOR') {
    return next();
  }

  const edificioId = req.params?.edificioId || req.body?.edificioId || req.query?.edificioId;

  if (!edificioId) {
    return next();
  }

  try {
    const prisma = require('../config/database');
    const admin = await prisma.administrador.findFirst({
      where: {
        usuarioId: req.user.id,
        edificioId: edificioId,
        activo: true
      }
    });

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a este edificio. Solo puedes gestionar tus edificios asignados.'
      });
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Error interno al validar edificio' });
  }
};

module.exports = { roleGuard, adminEdificioGuard };