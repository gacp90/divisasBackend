/** =====================================================================
 *  CITIES ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getCitiesQuery, getCityId, createCity, updateCity } = require('../controllers/cities.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.get('/query', validarJWT, getCitiesQuery);

/** =====================================================================
 *  GET ID
=========================================================================*/
router.get('/user/:id', validarJWT, getCityId);

/** =====================================================================
 *  POST CREATE
=========================================================================*/
router.post('/', [
        check('code', 'El codigo es obligatorio').not().isEmpty(),
        validarCampos
    ],
    createCity
);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updateCity);



// EXPORT
module.exports = router;