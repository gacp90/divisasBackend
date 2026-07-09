const { response } = require('express');
const ReportesService = require('../services/reportes.service');

/**
 * Controlador de Reportes.
 * Su única responsabilidad es recibir la petición, extraer parámetros y delegar
 * el trabajo pesado al servicio, manteniendo la arquitectura limpia (SOLID).
 */
const getReporteDian = async (req, res = response) => {
    try {
        const { fechain, fechaout, formato } = req.body;

        if (!fechain || !fechaout || !formato) {
            return res.status(400).json({
                ok: false,
                msg: 'Las fechas (fechain, fechaout) y el formato (1100, 1099, 1121) son obligatorios.'
            });
        }

        let opciones = {};

        // Mapeo de reglas de negocio específicas de la DIAN según el formato
        if (formato === '1100') {
            opciones.tipoTransaccion = 'Venta';
            opciones.operadorMonto = { $gte: 500 };
        } else if (formato === '1099') {
            opciones.tipoTransaccion = 'Compra';
            opciones.operadorMonto = { $gte: 500 };
        } else if (formato === '1121') {
            // El formato 1121 aplica tanto a Compra como a Venta, así que no filtramos tipoTransaccion,
            // pero el servicio ya garantiza que no pasen Notas de Crédito.
            opciones.operadorMonto = { $gt: 200, $lt: 500 };
        } else {
            return res.status(400).json({ ok: false, msg: 'Formato DIAN no soportado.' });
        }

        // Delegamos al servicio para garantizar las reglas fiscales inmutables
        const transacciones = await ReportesService.getFiscalData({ fechain, fechaout }, opciones);

        res.json({
            ok: true,
            total: transacciones.length,
            transacciones
        });

    } catch (error) {
        console.error('Error en getReporteDian:', error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }
};

const getReporteUiaf = async (req, res = response) => {
    try {
        const { fechain, fechaout } = req.body;

        if (!fechain || !fechaout) {
            return res.status(400).json({
                ok: false,
                msg: 'Las fechas (fechain, fechaout) son obligatorias.'
            });
        }

        // UIAF requiere todas las operaciones (Compra/Venta) mayores o iguales a 500 USD
        const opciones = {
            operadorMonto: { $gte: 500 }
        };

        const transacciones = await ReportesService.getFiscalData({ fechain, fechaout }, opciones);

        res.json({
            ok: true,
            total: transacciones.length,
            transacciones
        });

    } catch (error) {
        console.error('Error en getReporteUiaf:', error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        });
    }
};

module.exports = {
    getReporteDian,
    getReporteUiaf
};
