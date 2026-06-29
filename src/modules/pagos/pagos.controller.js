const pagosService = require("./pagos.service");
const { success, error } = require("../../shared/utils/response");

/**
 * Pagos Controller — Suscripción mensual, boletas y estado.
 */
const pagosController = {

  async consultarSesion(req, res) {
    try {
      const { tokenPago } = req.query;
      if (!tokenPago) {
        return error(res, 'tokenPago es requerido', 400);
      }
      const sesion = pagosService.consultarSesionPago(tokenPago);
      return success(res, sesion, 'Estado de sesión de pago');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /** POST /api/pagos/renovacion/iniciar — renovación del plan actual */
  async iniciarRenovacion(req, res) {
    try {
      const { edificioId } = req.body;
      if (!edificioId) {
        return error(res, 'edificioId es requerido', 400);
      }
      const sesion = await pagosService.iniciarRenovacionMensual(edificioId, req.user.id);
      return success(res, sesion, 'Sesión de renovación iniciada');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /** POST /api/pagos/renovacion/confirmar */
  async confirmarRenovacion(req, res) {
    try {
      const { tokenPago } = req.body;
      if (!tokenPago) {
        return error(res, 'tokenPago es requerido', 400);
      }
      const resultado = await pagosService.confirmarPagoSuscripcion(tokenPago, req.user.id);
      return success(res, resultado, 'Renovación confirmada');
    } catch (err) {
      return error(res, err.message, 400);
    }
  },

  /** GET /api/pagos/suscripcion/:edificioId — vencimiento, gracia, plan */
  async estadoSuscripcion(req, res) {
    try {
      const estado = await pagosService.obtenerEstadoSuscripcion(
        req.params.edificioId,
        req.user.id
      );
      return success(res, estado, 'Estado de suscripción');
    } catch (err) {
      return error(res, err.message, 403);
    }
  },

  async obtenerBoletas(req, res) {
    try {
      const boletas = await pagosService.obtenerBoletasEdificio(
        req.params.edificioId,
        req.user.id,
        req.query
      );
      return success(res, boletas, 'Boletas obtenidas correctamente');
    } catch (err) {
      return error(res, err.message, 403);
    }
  },

  /** GET /api/pagos/boletas/comprobante/:boletaId/descargar — PDF */
  async descargarBoleta(req, res) {
    try {
      const { boletaId } = req.params;
      const pdf = await pagosService.descargarBoletaPDF(boletaId, req.user.id);

      res.setHeader('Content-Type', pdf.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
      return res.send(pdf.buffer);
    } catch (err) {
      console.error('Error descargando boleta:', err);
      return error(res, err.message, 403);
    }
  },

  async obtenerEstadisticas(req, res) {
    try {
      const estadisticas = await pagosService.obtenerEstadisticasPagos(
        req.params.edificioId,
        req.user.id
      );
      return success(res, estadisticas, 'Estadísticas obtenidas correctamente');
    } catch (err) {
      return error(res, err.message, 403);
    }
  },

  /**
   * Actualizar registros viejos de suscripciones (solo admin/superadmin)
   * POST /api/pagos/mantenimiento/actualizar-registros-viejos
   */
  async actualizarRegistrosViejos(req, res) {
    try {
      // Verificar que sea admin o superadmin (opcional, según requerimientos)
      // Por ahora, cualquier usuario autenticado puede ejecutarlo
      const resultado = await pagosService.actualizarRegistrosViejosSuscripciones();
      return success(res, resultado, 'Registros viejos actualizados correctamente');
    } catch (err) {
      return error(res, err.message, 500);
    }
  }
};

module.exports = pagosController;
