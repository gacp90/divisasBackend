/** =====================================================================
 *  PAISES ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../../../shared/middlewares/validar-campos');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');
const { validarRoleGlobal } = require('../../../shared/middlewares/validar-role-global');

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
        validarJWT,
        validarRoleGlobal,
        // check('code', 'El codigo es obligatorio').not().isEmpty(),
        validarCampos
    ],
    createPais
);

/** =====================================================================
 *  POST CREATE PAISES EXCEL
=========================================================================*/
router.post('/create/excel', [validarJWT, validarRoleGlobal], createPaisestExcel);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', [validarJWT, validarRoleGlobal], updatePais);

// EXPORT
module.exports = router;
