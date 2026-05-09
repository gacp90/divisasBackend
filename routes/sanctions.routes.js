const { Router } = require('express');

// CONTROLLERS
const { checkClient, forceDownload } = require('../controllers/sanctions.controller');
const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();

/** =====================================================================
 *  CHECK CLIENT
=========================================================================*/
router.post('/check', checkClient);
router.get('/force', forceDownload);

// EXPORT
module.exports = router;
