const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../../../shared/middlewares/validar-campos');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');
const { validarRoleGlobal } = require('../../../shared/middlewares/validar-role-global');

const { getGlobalBranches, editGlobalBranchName, createGlobalBranch, deleteGlobalBranch } = require('../controllers/global-branches.controller');

const router = Router();

router.use(validarJWT);
router.use(validarRoleGlobal);

// Obtener todas las empresas con sus sucursales
router.get('/', getGlobalBranches);

// Crear una nueva sucursal (para el wizard SaaS)
router.post('/:subdominio', [
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    check('path', 'La ruta es obligatoria').not().isEmpty(),
    validarCampos
], createGlobalBranch);

// Editar datos de una sucursal
router.put('/:subdominio/:branchId/name', [
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    validarCampos
], editGlobalBranchName);

// Activar/Desactivar sucursal
router.put('/:subdominio/:branchId/toggle', [
    check('isActive', 'El estado isActive es obligatorio').isBoolean(),
    validarCampos
], require('../controllers/global-branches.controller').toggleGlobalBranch);

// Eliminar una sucursal
router.delete('/:subdominio/:branchId', deleteGlobalBranch);

module.exports = router;
