/** =====================================================================
 *  TRANSACCIONES ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getTransaccionesQuery, getTransaccionId, createTransaccion, updateTransaccion } = require('../controllers/transacciones.controller');

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
    check('monto', 'El monto es obligatorio').not().isEmpty(),
    check('monto', 'El monto es obligatorio').not().isEmpty(),
    validarCampos

], createTransaccion);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updateTransaccion);



// EXPORT
module.exports = router;