/** =====================================================================
 *  DEPARTMENTS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getDepartmentsQuery, getDepartmentId, createDepartment, updateDepartment } = require('../controllers/deparments.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.get('/query', validarJWT, getDepartmentsQuery);

/** =====================================================================
 *  GET ID
=========================================================================*/
router.get('/user/:id', validarJWT, getDepartmentId);

/** =====================================================================
 *  POST CREATE
=========================================================================*/
router.post('/', [
        // check('code', 'El codigo es obligatorio').not().isEmpty(),
        validarCampos
    ],
    createDepartment
);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updateDepartment);



// EXPORT
module.exports = router;