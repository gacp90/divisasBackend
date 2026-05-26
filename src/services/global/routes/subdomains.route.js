const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../../../shared/middlewares/validar-campos');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');
const { validarRoleGlobal } = require('../../../shared/middlewares/validar-role-global');

const { getSubdomains, createSubdomain, toggleSubdomain } = require('../controllers/subdomains.controller');

const router = Router();

// Todas las rutas aquí requieren autenticación y rol de OWNER
router.use(validarJWT);
router.use(validarRoleGlobal); // Usa el middleware global en lugar de validarROLE

// Obtener lista de empresas
router.get('/', getSubdomains);

// Crear empresa
router.post('/', [
    check('subdominio', 'El subdominio es obligatorio').not().isEmpty(),
    validarCampos
], createSubdomain);

// Activar/Desactivar empresa
router.put('/:id', [
    check('isActive', 'El estado isActive es obligatorio').isBoolean(),
    validarCampos
], toggleSubdomain);

module.exports = router;
