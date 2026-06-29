/**
 * HTML de boleta/comprobante para exportar a PDF.
 */
function generarHTMLBoleta(boleta, edificio, planNombre) {
  const fechaPago = boleta.fechaPago
    ? new Date(boleta.fechaPago).toLocaleString('es-PE')
    : new Date(boleta.fechaCreacion).toLocaleString('es-PE');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Boleta ${boleta.codigoPago}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #222; }
    .header { text-align: center; border-bottom: 2px solid #008B8B; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { color: #008B8B; margin: 0; font-size: 22px; }
    .meta p { margin: 6px 0; }
    .total { font-size: 20px; font-weight: bold; margin-top: 24px; text-align: right; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DepaManager — Comprobante de pago</h1>
    <p>Boleta electrónica de suscripción mensual</p>
  </div>
  <div class="meta">
    <p><strong>Edificio:</strong> ${edificio.nombre}</p>
    <p><strong>Plan:</strong> ${planNombre || 'N/A'}</p>
    <p><strong>Descripción:</strong> ${boleta.descripcion}</p>
    <p><strong>Código de pago:</strong> ${boleta.codigoPago}</p>
    <p><strong>Método:</strong> ${boleta.metodoPago || 'YAPE'}</p>
    <p><strong>Fecha de pago:</strong> ${fechaPago}</p>
    <p><strong>ID comprobante:</strong> ${boleta.id}</p>
  </div>
  <p class="total">Total pagado: S/ ${Number(boleta.monto).toFixed(2)}</p>
  <div class="footer">
    <p>Documento generado el ${new Date().toLocaleString('es-PE')}</p>
    <p>Acredita el pago de la suscripción del edificio en DepaManager.</p>
  </div>
</body>
</html>`;
}

module.exports = { generarHTMLBoleta };
