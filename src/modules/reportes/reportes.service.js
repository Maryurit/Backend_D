const puppeteer = require('puppeteer-core');
const prisma = require("../../shared/config/database");
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const fsSync = require('fs');

/**
 * Reportes Service - Generación de reportes en PDF
 */
const reportesService = {

  /**
   * Generar reporte de accesos por edificio
   */
  async generarReporteAccesos(edificioId, fechaDesde, fechaHasta) {
    try {
      // Obtener datos del edificio
      const edificio = await prisma.edificio.findUnique({
        where: { id: edificioId },
        include: {
          propietario: { select: { nombres: true, apellidos: true } }
        }
      });

      if (!edificio) {
        throw new Error('Edificio no encontrado');
      }

      // Obtener historial de accesos
      const accesos = await prisma.historialAcceso.findMany({
        where: {
          edificioId,
          fechaEvento: {
            gte: new Date(fechaDesde),
            lte: new Date(fechaHasta)
          }
        },
        include: {
          vehiculo: {
            include: {
              inquilino: {
                include: {
                  usuario: { select: { nombres: true, apellidos: true } },
                  unidad: { select: { numero: true } }
                }
              }
            }
          },
          camara: { select: { nombre: true, ubicacion: true } }
        },
        orderBy: { fechaEvento: 'desc' }
      });

      // Estadísticas
      const totalAccesos = accesos.length;
      const accesosPermitidos = accesos.filter(a => a.tipo === 'PLACA').length;
      const alertas = accesos.filter(a => a.alerta !== null).length;

      const html = this.generarHTMLReporteAccesos(edificio, accesos, {
        fechaDesde,
        fechaHasta,
        totalAccesos,
        accesosPermitidos,
        alertas
      });

      return await this.generarPDF(html, `reporte-accesos-${edificio.nombre}-${fechaDesde}-${fechaHasta}.pdf`);

    } catch (error) {
      console.error('Error generando reporte de accesos:', error);
      throw new Error('Error al generar reporte de accesos');
    }
  },

  /**
   * Generar reporte de inquilinos por edificio
   */
  async generarReporteInquilinos(edificioId) {
    try {
      const edificio = await prisma.edificio.findUnique({
        where: { id: edificioId },
        include: {
          propietario: { select: { nombres: true, apellidos: true } },
          unidades: {
            include: {
              inquilino: {
                include: {
                  usuario: { select: { nombres: true, apellidos: true, telefono: true, email: true } },
                  vehiculo: true
                }
              }
            }
          }
        }
      });

      if (!edificio) {
        throw new Error('Edificio no encontrado');
      }

      const html = this.generarHTMLReporteInquilinos(edificio);

      return await this.generarPDF(html, `reporte-inquilinos-${edificio.nombre}.pdf`);

    } catch (error) {
      console.error('Error generando reporte de inquilinos:', error);
      throw new Error('Error al generar reporte de inquilinos');
    }
  },

  /**
   * Generar reporte financiero
   */
  async generarReporteFinanciero(edificioId, fechaDesde, fechaHasta) {
    try {
      const edificio = await prisma.edificio.findUnique({
        where: { id: edificioId },
        include: {
          propietario: { select: { nombres: true, apellidos: true } },
          suscripcion: { include: { plan: true } }
        }
      });

      if (!edificio) {
        throw new Error('Edificio no encontrado');
      }

      // Solo boletas emitidas tras pago confirmado de suscripción
      const boletas = await prisma.factura.findMany({
        where: {
          edificioId,
          estado: 'PAGADA',
          fechaPago: {
            gte: new Date(fechaDesde),
            lte: new Date(fechaHasta)
          }
        },
        orderBy: { fechaPago: 'desc' }
      });

      const ingresosTotales = boletas.reduce((sum, b) => sum + Number(b.monto), 0);

      const html = this.generarHTMLReporteFinanciero(edificio, boletas, {
        fechaDesde,
        fechaHasta,
        totalBoletas: boletas.length,
        ingresosTotales
      });

      return await this.generarPDF(html, `reporte-financiero-${edificio.nombre}-${fechaDesde}-${fechaHasta}.pdf`);

    } catch (error) {
      console.error('Error generando reporte financiero:', error);
      throw new Error('Error al generar reporte financiero');
    }
  },

  /**
   * Generar HTML para reporte de accesos
   */
  generarHTMLReporteAccesos(edificio, accesos, stats) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Accesos - ${edificio.nombre}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat-box { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte de Accesos</h1>
          <h2>${edificio.nombre}</h2>
          <p>Propietario: ${edificio.propietario.nombres} ${edificio.propietario.apellidos}</p>
          <p>Período: ${new Date(stats.fechaDesde).toLocaleDateString()} - ${new Date(stats.fechaHasta).toLocaleDateString()}</p>
        </div>

        <div class="stats">
          <div class="stat-box">
            <h3>${stats.totalAccesos}</h3>
            <p>Total de Accesos</p>
          </div>
          <div class="stat-box">
            <h3>${stats.accesosPermitidos}</h3>
            <p>Accesos Permitidos</p>
          </div>
          <div class="stat-box">
            <h3>${stats.alertas}</h3>
            <p>Alertas de Seguridad</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Fecha/Hora</th>
              <th>Tipo Evento</th>
              <th>Vehículo</th>
              <th>Inquilino</th>
              <th>Unidad</th>
              <th>Cámara</th>
            </tr>
          </thead>
          <tbody>
            ${accesos.map(acceso => `
              <tr>
                <td>${new Date(acceso.fechaEvento).toLocaleString()}</td>
                <td>${acceso.alerta ? 'Alerta Sospechosa' : 'Acceso Permitido'}</td>
                <td>${acceso.vehiculo ? `${acceso.vehiculo.placa} (${acceso.vehiculo.modelo})` : 'N/A'}</td>
                <td>${acceso.vehiculo?.inquilino?.usuario ? `${acceso.vehiculo.inquilino.usuario.nombres} ${acceso.vehiculo.inquilino.usuario.apellidos}` : 'N/A'}</td>
                <td>${acceso.vehiculo?.inquilino?.unidad?.numero || 'N/A'}</td>
                <td>${acceso.camara.nombre} (${acceso.camara.ubicacion})</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Reporte generado el ${new Date().toLocaleString()}</p>
          <p>DepaManager - Sistema de Gestión de Edificios</p>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Generar HTML para reporte de inquilinos
   */
  generarHTMLReporteInquilinos(edificio) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Inquilinos - ${edificio.nombre}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte de Inquilinos</h1>
          <h2>${edificio.nombre}</h2>
          <p>Propietario: ${edificio.propietario.nombres} ${edificio.propietario.apellidos}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Unidad</th>
              <th>Nombre Completo</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Estado Contrato</th>
              <th>Fecha Fin Contrato</th>
              <th>Vehículo</th>
            </tr>
          </thead>
          <tbody>
            ${edificio.unidades.map(unidad => {
              const inquilino = unidad.inquilino;
              if (!inquilino) return '';

              return `
                <tr>
                  <td>${unidad.numero}</td>
                  <td>${inquilino.usuario.nombres} ${inquilino.usuario.apellidos}</td>
                  <td>${inquilino.usuario.email}</td>
                  <td>${inquilino.usuario.telefono || 'N/A'}</td>
                  <td>${inquilino.estadoContrato}</td>
                  <td>${new Date(inquilino.fechaFinContrato).toLocaleDateString()}</td>
                  <td>${inquilino.vehiculo ? `${inquilino.vehiculo.placa} (${inquilino.vehiculo.modelo})` : 'Sin vehículo'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Reporte generado el ${new Date().toLocaleString()}</p>
          <p>DepaManager - Sistema de Gestión de Edificios</p>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Generar HTML para reporte financiero
   */
  generarHTMLReporteFinanciero(edificio, boletas, stats) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte Financiero - ${edificio.nombre}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat-box { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
          .income { background: #d4edda; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte de Boletas — Suscripción DepaManager</h1>
          <h2>${edificio.nombre}</h2>
          <p>Propietario: ${edificio.propietario.nombres} ${edificio.propietario.apellidos}</p>
          <p>Plan actual: ${edificio.suscripcion?.plan?.nombre || 'N/A'}</p>
          <p>Período: ${new Date(stats.fechaDesde).toLocaleDateString()} - ${new Date(stats.fechaHasta).toLocaleDateString()}</p>
        </div>

        <div class="stats">
          <div class="stat-box">
            <h3>${stats.totalBoletas}</h3>
            <p>Boletas emitidas</p>
          </div>
          <div class="stat-box income">
            <h3>S/ ${stats.ingresosTotales.toFixed(2)}</h3>
            <p>Ingresos por suscripciones</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Fecha de pago</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Código</th>
              <th>Método</th>
            </tr>
          </thead>
          <tbody>
            ${boletas.map(boleta => `
              <tr>
                <td>${new Date(boleta.fechaPago).toLocaleDateString()}</td>
                <td>${boleta.descripcion}</td>
                <td>S/ ${Number(boleta.monto).toFixed(2)}</td>
                <td>${boleta.codigoPago}</td>
                <td>${boleta.metodoPago || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Reporte generado el ${new Date().toLocaleString()}</p>
          <p>DepaManager - Sistema de Gestión de Edificios</p>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Generar PDF desde HTML usando Puppeteer
   */
  obtenerRutaNavegador() {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const plataforma = os.platform();
    const posiblesRutas = [];

    if (plataforma === 'win32') {
      posiblesRutas.push(
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
      );
    } else if (plataforma === 'darwin') {
      posiblesRutas.push(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
      );
    } else {
      posiblesRutas.push(
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/microsoft-edge'
      );
    }

    return posiblesRutas.find(ruta => fsSync.existsSync(ruta));
  },

  async generarPDF(html, filename) {
    let browser;
    try {
      const executablePath = this.obtenerRutaNavegador();
      if (!executablePath) {
        throw new Error('No se encontró un navegador local compatible. Define PUPPETEER_EXECUTABLE_PATH con la ruta de Chrome o Edge.');
      }

      browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      await browser.close();

      return {
        buffer: pdfBuffer,
        filename,
        mimeType: 'application/pdf'
      };

    } catch (error) {
      if (browser) await browser.close();
      console.error('Error generando PDF:', error);
      throw new Error('Error al generar PDF');
    }
  }
};

module.exports = reportesService;