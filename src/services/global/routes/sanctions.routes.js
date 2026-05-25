const { Router } = require('express');

// CONTROLLERS
const { checkClient, getStatus } = require('../controllers/sanctions.controller');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');

const router = Router();

/** =====================================================================
 *  CHECK CLIENT
=========================================================================*/
router.post('/check', checkClient);
router.get('/status', validarJWT, getStatus);

// EXPORT
module.exports = router;
