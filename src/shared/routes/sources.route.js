/** =====================================================================
 *  SOURCES ROUTER 
=========================================================================*/
const { Router } = require('express');

// MIDDLEWARES
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getSourcesQuery } = require('../controllers/sources.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.post('/query', validarJWT, getSourcesQuery);

// EXPORT
module.exports = router;