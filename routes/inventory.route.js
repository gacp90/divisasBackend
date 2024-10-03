/** =====================================================================
 *  INVENTORY ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getInventoriesQuery, getInventoryId, createInventory, updateInventory } = require('../controllers/inventories.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.get('/query', validarJWT, getInventoriesQuery);

/** =====================================================================
 *  GET ID
=========================================================================*/
router.get('/user/:id', validarJWT, getInventoryId);

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