/** =====================================================================
 *  EMPRESA ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const expressFileUpload = require('express-fileupload');
const { validarCampos } = require('../../../shared/middlewares/validar-campos');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');

// CONTROLLERS
const { getEmpresa, createEmpresa, updateEmpresa, updateLogo, getEstadoSuscripcion } = require('../controllers/empresas.controller');

const router = Router();

router.use(expressFileUpload());

/** =====================================================================
 *  GET EMPRESA
=========================================================================*/
router.get('/', validarJWT, getEmpresa);
/** =====================================================================
 *  GET EMPRESA
=========================================================================*/
/** =====================================================================
 *  POST CREATE EMPRESA
=========================================================================*/
router.post('/', [
        validarJWT,
        validarCampos
    ],
    createEmpresa
);
/** =====================================================================
 *  POST CREATE EMPRESA
=========================================================================*/
/** =====================================================================
 *  PUT EMPRESA
=========================================================================*/
router.put('/:id', validarJWT, updateEmpresa);

/** =====================================================================
 *  UPDATE LOGO EMPRESA
=========================================================================*/
router.put('/update/logo/:id', validarJWT, updateLogo);

/** =========================================
 *  ESTADO DE SUSCRIPCIÓN
=========================================*/
router.get('/suscripcion', validarJWT, getEstadoSuscripcion);

// EXPORT
module.exports = router;
