const Transaccion = require('../models/transacciones.model');
const Inventories = require('../models/inventory.model');
const Empresa = require('../models/empresa.model');

/**
 * Módulo centralizado de Reportes.
 * Encapsula de forma estricta las reglas de negocio, 
 * asegurando que el Frontend no pueda burlarlas ni enviar filtros maliciosos.
 */
class ReportesService {

    /**
     * Construye y ejecuta el query base para todo reporte fiscal (DIAN, UIAF).
     * Inyecta irremediablemente las reglas de exclusión de anuladas y notas de crédito.
     * @param {Object} fechas - { fechain, fechaout } 
     * @param {Object} opciones - { tipoTransaccion, operadorMonto }
     * @returns {Promise<Array>} Array de transacciones
     */
    static async getFiscalData(fechas, opciones = {}) {
        const { fechain, fechaout } = fechas;
        const { tipoTransaccion, operadorMonto } = opciones;

        // Reglas de negocio fiscales (Inmutables)
        const query = {
            status: true, // Siempre transacciones válidas, nunca anuladas.
            fecha: { $gte: new Date(fechain), $lte: new Date(fechaout) },
            transaccion: { $in: ['Compra', 'Venta'] } // Excluimos Notas de Crédito
        };

        if (tipoTransaccion) {
            query.transaccion = tipoTransaccion;
        }

        if (operadorMonto) {
            // Obtenemos el ID de la moneda USD para evaluar su monto físico
            const usdInventory = await Inventories.findOne({ code: 'USD' });

            const eqCondition = { equivalencia: operadorMonto };

            if (usdInventory) {
                const usdCondition = {
                    items: {
                        $elemMatch: {
                            moneda: usdInventory._id,
                            monto: operadorMonto
                        }
                    }
                };
                query.$or = [eqCondition, usdCondition];
            } else {
                Object.assign(query, eqCondition);
            }
        }

        // Consultar ordenado por fecha con datos poblados para poder inyectar campos virtuales
        const transacciones = await Transaccion.find(query)
            .populate({
                path: 'client',
                populate: {
                    path: 'representante'
                }
            })
            .populate('items.moneda')
            .sort({ fecha: 1 })
            .lean();

        // Obtener la empresa para el fallback de contingencia (UIAF legacy)
        const empresa = await Empresa.findOne();
        const FOREIGNER_DOCS = ['42', '22', '41', '21', '47', '48', '50'];

        transacciones.forEach(tx => {
            const cli = tx.client;

            if (cli) {
                // 1. DANE DEL CLIENTE / EMPRESA
                if (FOREIGNER_DOCS.includes(String(cli.typeid))) {
                    tx.codigoDaneReporte = '00099';
                } else {
                    // Colombianos (13) o NIT (31) u otros
                    if (cli.department && cli.city) {
                        tx.codigoDaneReporte = `${cli.department}${cli.city.padStart(3, '0')}`;
                    } else {
                        // FALLBACK UIAF para legacy records
                        const empDepto = (empresa && empresa.camara && empresa.camara.department) ? empresa.camara.department : '00';
                        const empCiudad = ((empresa && empresa.camara && empresa.camara.city) ? empresa.camara.city : '000').padStart(3, '0');
                        tx.codigoDaneReporte = `${empDepto}${empCiudad}`;
                    }
                }

                // 2. DANE DEL REPRESENTANTE LEGAL (Evaluación Independiente)
                if (cli.type === '1' && cli.representante) {
                    if (FOREIGNER_DOCS.includes(String(cli.representante.typeid))) {
                        tx.codigoDaneRepresentanteReporte = '00099';
                    } else {
                        const rDepto = cli.representante.department || '00';
                        const rCiudad = (cli.representante.city || '000').padStart(3, '0');
                        tx.codigoDaneRepresentanteReporte = `${rDepto}${rCiudad}`;
                    }
                }
            }
        });

        return transacciones;
    }

}

module.exports = ReportesService;
