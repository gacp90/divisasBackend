/** =====================================================================
 *  PAISES ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getPaisesQuery, getPaisId, createPais, updatePais, createPaisestExcel } = require('../controllers/pais.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.post('/query', validarJWT, getPaisesQuery);

/** =====================================================================
 *  GET ID
=========================================================================*/
router.get('/user/:id', validarJWT, getPaisId);

/** =====================================================================
 *  POST CREATE
=========================================================================*/
router.post('/', [
        // check('code', 'El codigo es obligatorio').not().isEmpty(),
        validarCampos
    ],
    createPais
);

/** =====================================================================
 *  POST CREATE PAISES EXCEL
=========================================================================*/
router.post('/create/excel', validarJWT, createPaisestExcel);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updatePais);

// EXPORT
module.exports = router;