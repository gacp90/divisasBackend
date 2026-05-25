/** =====================================================================
 *  TRASLADOS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../../../shared/middlewares/validar-campos');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');

// CONTROLLERS
const { getTrasladosQuery, getTrasladosCierre, getTrasladoId, createTraslado, updateTraslado } = require('../controllers/traslados.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.post('/query', validarJWT, getTrasladosQuery);

/** =====================================================================
 *  GET QUERY CIERRE
=========================================================================*/
router.post('/query/cierre', validarJWT, getTrasladosCierre);


/** =====================================================================
 *  GET ID
=========================================================================*/
router.get('/:id', validarJWT, getTrasladoId);

/** =====================================================================
 *  POST CREATE
=========================================================================*/
router.post('/', validarJWT, createTraslado);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updateTraslado);

// EXPORT
module.exports = router;
