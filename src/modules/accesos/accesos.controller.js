const accesosService = require("./accesos.service");
const { success, error } = require("../../shared/utils/response");

/**
 * Accesos Controller - Recibe placas detectadas y alertas desde Python
 */
const accesosController = {

  async registrar(req, res) {
    try {
      const { placaDetectada, camaraId, tipoEvento, descripcion } = req.body;

      // Validar campos requeridos
      if (!camaraId) {
        return error(res, 'Falta ID de cámara', 400);
      }

      if (!tipoEvento) {
        return error(res, 'Falta tipo de evento', 400);
      }

      let resultado;

      if (tipoEvento === "PLACA") {
        // Evento de placa detectada
        if (!placaDetectada) {
          return error(res, 'Falta placa detectada', 400);
        }
        resultado = await accesosService.registrarDesdeIA(placaDetectada, camaraId);

      } else if (tipoEvento === "SOSPECHOSA") {
        // Evento de conducta sospechosa
        if (!descripcion) {
          return error(res, 'Falta descripción de la alerta', 400);
        }
        resultado = await accesosService.registrarAlertaSospechosa(camaraId, descripcion);

      } else {
        return error(res, `Tipo de evento no soportado: ${tipoEvento}`, 400);
      }

      return success(res, resultado, 'Evento procesado correctamente');
    } catch (err) {
      console.error('Error en accesos controller:', err);
      return error(res, 'Error al procesar evento', 500);
    }
  },

  async obtenerHistorial(req, res) {
    try {
      const filtros = {
        desde: req.query.desde,
        hasta: req.query.hasta,
        tipo: req.query.tipo,
        resultado: req.query.resultado,
        edificioId: req.query.edificioId
      };

      const historial = await accesosService.obtenerHistorial(
        req.user,
        filtros,
        req.limiteHistorial
      );
      return success(res, historial, 'Historial de accesos obtenido correctamente');
    } catch (err) {
      console.error('Error obteniendo historial de accesos:', err);
      return error(res, 'Error al obtener historial de accesos', 500);
    }
  }
};

module.exports = accesosController;