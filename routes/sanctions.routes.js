const { Router } = require('express');

// CONTROLLERS
const { checkClient } = require('../controllers/sanctions.controller');
const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();

/** =====================================================================
 *  CHECK CLIENT
=========================================================================*/
router.post('/check', checkClient);

// EXPORT
module.exports = router;
