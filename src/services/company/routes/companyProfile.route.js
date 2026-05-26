const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../../../shared/middlewares/validar-campos');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');
const { getCompanyProfile, saveCompanyProfile } = require('../controllers/companyProfile.controller');

const router = Router();

router.get('/', validarJWT, getCompanyProfile);

router.post('/', [
    validarJWT,
    check('tipoPersona', 'El tipo de persona es obligatorio').not().isEmpty(),
    check('nit', 'El NIT o documento es obligatorio').not().isEmpty(),
    check('representanteLegal', 'El representante legal es obligatorio').not().isEmpty(),
    validarCampos
], saveCompanyProfile);

module.exports = router;
