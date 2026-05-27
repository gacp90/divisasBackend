/** =====================================================================
 *  LOGIN ROUTER
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// HELPERS
const { validarCampos } = require('../../../shared/middlewares/validar-campos');
const { validarJWT, validarJWTClient } = require('../../../shared/middlewares/validar-jwt');

// CONTROLLERS
const { login, renewJWT, logout } = require('../controllers/auth.controller');

const router = Router();

/** =====================================================================
 *  LOGIN
=========================================================================*/
router.post('/', [
        check('user', 'El user es obligatorio').not().isEmpty(),
        check('password', 'La contraseña es obligatoria').not().isEmpty(),
        validarCampos
    ],
    login
);

/** =====================================================================
 *  RENEW TOKEN
=========================================================================*/
router.get('/renew', validarJWT, renewJWT);
/** =====================================================================
 *  LOGOUT
=========================================================================*/
router.post('/logout', validarJWT, logout);


// EXPORT
module.exports = router;
