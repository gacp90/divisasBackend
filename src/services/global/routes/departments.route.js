/** =====================================================================
 *  DEPARTMENTS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../../../shared/middlewares/validar-campos');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');

// CONTROLLERS
const { getDepartmentsQuery, getDepartmentId, createDepartment, updateDepartment, createDepartamentostExcel } = require('../controllers/departments.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.post('/query', validarJWT, getDepartmentsQuery);

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
 *  POST CREATE EXCEL
=========================================================================*/
router.post('/create/excel', validarJWT, createDepartamentostExcel);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updateDepartment);



// EXPORT
module.exports = router;
