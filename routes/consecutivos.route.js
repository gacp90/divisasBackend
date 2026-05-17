/*
    Rutas de Consecutivos
    host + /api/v1/consecutivos
*/
const { Router } = require('express');
const { validarJWT } = require('../middlewares/validar-jwt');
const { getConsecutivos, updateConsecutivo } = require('../controllers/consecutivos.controller');

const router = Router();

/** =====================================================================
 *  GET
=========================================================================*/
router.get('/', validarJWT, getConsecutivos);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updateConsecutivo);

// EXPORT
module.exports = router;
