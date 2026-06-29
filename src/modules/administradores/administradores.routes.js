const express = require('express');
const router = express.Router();

const prisma = require('../../shared/config/database');
const authMiddleware = require('../../shared/middlewares/auth.middleware');

router.use(authMiddleware);

/**
 * Obtener edificios asignados a un administrador
 */
router.get('/usuario/:usuarioId/edificios', async (req, res) => {
  try {
    const { usuarioId } = req.params;

    const edificios = await prisma.administrador.findMany({
      where: { usuarioId },
      include: {
        edificio: true
      }
    });

    const result = edificios.map(e => e.edificio);

    return res.json(result);

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
});

module.exports = router;