/** =====================================================================
 *  CLIENTS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getClientsQuery, getClientId, createClient, updateClient, getDuplicates, importarClientsBulk } = require('../controllers/clients.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.post('/query', validarJWT, getClientsQuery);

/** =====================================================================
 *  GET ID
=========================================================================*/
router.get('/cliente/:id', validarJWT, getClientId);

/** =====================================================================
 *  GET DUPLICATES
=========================================================================*/
router.post('/duplicados', getDuplicates);

/** =====================================================================
 *  POST CREATE
=========================================================================*/
router.post('/', [
        // check('code', 'El codigo es obligatorio').not().isEmpty(), importarClientsBulk
        validarCampos
    ],
    createClient
);

/** =====================================================================
 *  POST IMPORT BULK
=========================================================================*/
router.post('/import/bulk', validarJWT, importarClientsBulk);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updateClient);



// EXPORT
module.exports = router;