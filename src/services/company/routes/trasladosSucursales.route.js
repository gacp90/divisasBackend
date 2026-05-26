const { Router } = require('express');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');
const { createTrasladoSucursal, getTrasladosSucursalesQuery } = require('../controllers/trasladosSucursales.controller');

const router = Router();

router.post('/query', validarJWT, getTrasladosSucursalesQuery);
router.post('/', validarJWT, createTrasladoSucursal);

module.exports = router;
