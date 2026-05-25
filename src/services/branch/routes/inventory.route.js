/** =====================================================================
 *  INVENTORY ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../../../shared/middlewares/validar-campos');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');

// CONTROLLERS
const { getInventoriesQuery, getInventoryId, createInventory, updateInventory } = require('../controllers/inventories.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.post('/query', validarJWT, getInventoriesQuery);

/** =====================================================================
 *  GET ID
=========================================================================*/
router.get('/divisa/:id', validarJWT, getInventoryId);

/** =====================================================================
 *  POST CREATE
=========================================================================*/
router.post('/', [
        // check('code', 'El codigo es obligatorio').not().isEmpty(),
        validarCampos
    ],
    createInventory
);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updateInventory);



// EXPORT
module.exports = router;
