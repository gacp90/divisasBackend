/** =====================================================================
 *  CITIES ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../../../shared/middlewares/validar-campos');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');
const { validarRoleGlobal } = require('../../../shared/middlewares/validar-role-global');

// CONTROLLERS
const { getCitiesQuery, getCityId, createCity, updateCity, createCitiesExcel } = require('../controllers/cities.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.post('/query', validarJWT, getCitiesQuery);

/** =====================================================================
 *  GET ID
=========================================================================*/
router.get('/user/:id', validarJWT, getCityId);

/** =====================================================================
 *  POST CREATE
=========================================================================*/
router.post('/', [
        validarJWT,
        validarRoleGlobal,
        check('code', 'El codigo es obligatorio').not().isEmpty(),
        validarCampos
    ],
    createCity
);

/** =====================================================================
 *  POST CREATE EXCEL
=========================================================================*/
router.post('/create/excel', [validarJWT, validarRoleGlobal], createCitiesExcel);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', [validarJWT, validarRoleGlobal], updateCity);



// EXPORT
module.exports = router;
