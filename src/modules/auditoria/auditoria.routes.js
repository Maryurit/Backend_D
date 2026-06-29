const express = require("express");
const router = express.Router();

const authMiddleware = require("../../shared/middlewares/auth.middleware");
const auditoriaController = require("./auditoria.controller");

router.use(authMiddleware);

// historial por usuario
router.get(
  "/usuario/:usuarioId",
  auditoriaController.getAuditoriaByUsuario
);

// estadísticas
router.get(
  "/usuario/:usuarioId/stats",
  auditoriaController.getAuditoriaStats
);

// filtro flexible
router.get(
  "/",
  auditoriaController.getAuditoria
);

module.exports = router;