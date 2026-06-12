const { Router } = require('express');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');
const { validarRoleAdmin, validarRoleResolucion } = require('../../../shared/middlewares/validar-role-admin');
const { createTrasladoSucursal, getTrasladosSucursalesQuery, updateTrasladoSucursal, getTurnosGlobal, getTrasladosInternosGlobal } = require('../controllers/trasladosSucursales.controller');

const router = Router();

router.get('/turnos-global', validarJWT, getTurnosGlobal);
router.get('/internos-global', [validarJWT, validarRoleAdmin], getTrasladosInternosGlobal);
router.post('/query', validarJWT, getTrasladosSucursalesQuery);
router.post('/', validarJWT, createTrasladoSucursal);
router.put('/:id', [validarJWT, validarRoleResolucion], updateTrasladoSucursal);

module.exports = router;
