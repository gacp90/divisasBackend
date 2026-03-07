/** =====================================================================
 *  EMPRESA ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const expressFileUpload = require('express-fileupload');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getEmpresa, createEmpresa, updateEmpresa, updateLogo } = require('../controllers/empresas.controller');

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

// EXPORT
module.exports = router;