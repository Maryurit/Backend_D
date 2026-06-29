require('dotenv').config();

/**
 * Middleware que protege rutas solamente para servicios externos confiables.
 * Se usa para la IA en lugar de crear un rol de usuario.
 */
const serviceAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const serviceToken = process.env.SERVICE_TOKEN;

  if (!serviceToken) {
    return res.status(500).json({
      success: false,
      message: 'SERVICE_TOKEN no está configurado en el backend'
    });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de servicio no proporcionado'
    });
  }

  const token = authHeader.split(' ')[1];
  if (token !== serviceToken) {
    return res.status(403).json({
      success: false,
      message: 'Token de servicio inválido'
    });
  }

  // No se agrega usuario al request porque este es un servicio, no un usuario humano.
  next();
};

module.exports = serviceAuthMiddleware;
