/** =====================================================================
 *  MOVIMIENTOS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getMovimientosQuery, getMovimientoId, createMovimiento, updateMovimiento } = require('../controllers/movimientos.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.post('/query', validarJWT, getMovimientosQuery);

/** =====================================================================
 *  GET ID
=========================================================================*/
router.get('/:id', validarJWT, getMovimientoId);

/** =====================================================================
 *  POST CREATE
=========================================================================*/
router.post('/', [
        validarJWT,
        check('type', 'El tipo de movimiento es obligatorio').not().isEmpty(),
        check('amount', 'El monto es obligatorio').not().isEmpty(),
        validarCampos
    ],
    createMovimiento
);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updateMovimiento);

// EXPORT
module.exports = router;