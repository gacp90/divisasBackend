const { Router } = require('express');
const router = Router();

const {
    getPagos,
    crearPago,
    aprobarPago
} = require('../controllers/pagos.controller');

const { validarJWT } = require('../middlewares/validar-jwt');
const { validarAccesoPagos } = require('../middlewares/validarAccesoPagos');

/** =========================================
 *  VER PAGOS (SOLO OWNER)
=========================================*/
router.get(
    '/',
    validarJWT,
    validarAccesoPagos,
    getPagos
);

/** =========================================
 *  CREAR PAGO (USUARIO NORMAL)
=========================================*/
router.post(
    '/',
    validarJWT,
    crearPago
);

/** =========================================
 *  APROBAR PAGO (SOLO OWNER)
=========================================*/
router.put(
    '/:id',
    validarJWT,
    validarAccesoPagos,
    aprobarPago
);

module.exports = router;
