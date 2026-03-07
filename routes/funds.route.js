/** =====================================================================
 *  FUNDS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getFundsQuery, getFundsId, createFunds, updateFunds, createFoundstExcel } = require('../controllers/funds.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.post('/query', validarJWT, getFundsQuery);

/** =====================================================================
 *  GET ID
=========================================================================*/
router.get('/user/:id', validarJWT, getFundsId);

/** =====================================================================
 *  POST CREATE
=========================================================================*/
router.post('/', [
        // check('code', 'El codigo es obligatorio').not().isEmpty(),
        validarCampos
    ],
    createFunds
);

/** =====================================================================
 *  POST CREATE FONDOS EXCEL
=========================================================================*/
router.post('/create/excel', validarJWT, createFoundstExcel);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updateFunds);



// EXPORT
module.exports = router;