/** =====================================================================
 *  RATES ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');

// CONTROLLERS
const { getRatesQuery, getRateId } = require('../controllers/rates.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.post('/query', validarJWT, getRatesQuery);

/** =====================================================================
 *  GET ID
=========================================================================*/
router.get('/user/:id', validarJWT, getRateId);



// EXPORT
module.exports = router;
