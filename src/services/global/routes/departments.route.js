/** =====================================================================
 *  DEPARTMENTS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../../../shared/middlewares/validar-campos');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');
const { validarRoleGlobal } = require('../../../shared/middlewares/validar-role-global');

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
        validarJWT,
        validarRoleGlobal,
        // check('code', 'El codigo es obligatorio').not().isEmpty(),
        validarCampos
    ],
    createDepartment
);

/** =====================================================================
 *  POST CREATE EXCEL
=========================================================================*/
router.post('/create/excel', [validarJWT, validarRoleGlobal], createDepartamentostExcel);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', [validarJWT, validarRoleGlobal], updateDepartment);



// EXPORT
module.exports = router;
