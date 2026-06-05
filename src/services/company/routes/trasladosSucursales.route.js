const { Router } = require('express');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');
const { createTrasladoSucursal, getTrasladosSucursalesQuery, updateTrasladoSucursal, getTurnosGlobal } = require('../controllers/trasladosSucursales.controller');

const router = Router();

router.get('/turnos-global', validarJWT, getTurnosGlobal);
router.post('/query', validarJWT, getTrasladosSucursalesQuery);
router.post('/', validarJWT, createTrasladoSucursal);
router.put('/:id', validarJWT, updateTrasladoSucursal);

module.exports = router;
