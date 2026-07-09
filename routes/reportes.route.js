/*
    Ruta: /api/v1/reportes
*/

const { Router } = require('express');
const { validarJWT } = require('../middlewares/validar-jwt');
const { getReporteDian, getReporteUiaf } = require('../controllers/reportes.controller');

const router = Router();

/**
 * Rutas de Contexto Fiscal
 * Estas rutas devuelven transacciones aplicando estrictamente reglas de negocio fiscales
 * (ej. status: true, excluyendo Notas de Crédito, y validando topes).
 */
router.post('/fiscales/dian', validarJWT, getReporteDian);
router.post('/fiscales/uiaf', validarJWT, getReporteUiaf);


// Futuras rutas se pueden agregar aquí:
// router.post('/auditoria/oficial', validarJWT, getReporteOficialCumplimiento);
// router.post('/operativos/caja', validarJWT, getReporteCuadreCaja);

module.exports = router;
