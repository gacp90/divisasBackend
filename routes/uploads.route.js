/** =====================================================================
 *  UPLOADS ROUTER
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const expressFileUpload = require('express-fileupload');

// CONTROLLERS
const { getImages, fileUpload } = require('../controllers/uploads.controller');
const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();

router.use(expressFileUpload());

/** =====================================================================
 *  UPLOADS
=========================================================================*/
router.put('/:tipo/:id', validarJWT, fileUpload);

/** =====================================================================
 *  GET IMAGES
=========================================================================*/
router.get('/:tipo/:image', getImages);

// EXPORT
module.exports = router;