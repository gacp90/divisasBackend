/** =====================================================================
 *  TRANSACCIONES ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getTransaccionesQuery, getTransaccionId, createTransaccion, updateTransaccion, cancelTransaccion, resendConexus, importarTransaccionesBulk } = require('../controllers/transacciones.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.post('/query', validarJWT, getTransaccionesQuery);

/** =====================================================================
 *  GET ID
=========================================================================*/
router.get('/:id', validarJWT, getTransaccionId);

/** =====================================================================
 *  POST CREATE
=========================================================================*/
router.post('/', [
    validarJWT,
    check('transaccion', 'El tipo de transaccion es obligatorio').not().isEmpty(),
    validarCampos

], createTransaccion);

/** =====================================================================
 *  POST IMPORT BULK
=========================================================================*/
router.post('/import/bulk', validarJWT, importarTransaccionesBulk);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updateTransaccion);

/** =====================================================================
 *  RESEND DIAN PUT
=========================================================================*/
router.put('/resend/:id', validarJWT, resendConexus);

/** =====================================================================
 *  DELETE 
=========================================================================*/
router.delete('/cancel/:id', validarJWT, cancelTransaccion);



// EXPORT
module.exports = router;