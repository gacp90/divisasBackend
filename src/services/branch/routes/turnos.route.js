/** =====================================================================
 *  MOVIMIENTOS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../../../shared/middlewares/validar-campos');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');

// CONTROLLERS
const { getTurnosQuery, getTurnoId, createTurno, updateTurno, cerrarTurno } = require('../controllers/turnos.controller');

const router = Router();

/** =====================================================================
 *  GET QUERY
=========================================================================*/
router.post('/query', validarJWT, getTurnosQuery);

/** =====================================================================
 *  GET ID
=========================================================================*/
router.get('/:id', validarJWT, getTurnoId);

/** =====================================================================
 *  POST CREATE
=========================================================================*/
router.post('/', validarJWT, createTurno);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updateTurno);

/** =====================================================================
 *  PUT
=========================================================================*/
router.post('/cerrar/turno', validarJWT, cerrarTurno);

// EXPORT
module.exports = router;
