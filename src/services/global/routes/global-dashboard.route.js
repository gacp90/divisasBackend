const { Router } = require('express');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');
const { getGlobalDashboardStats } = require('../controllers/global-dashboard.controller');

const router = Router();

router.get('/stats', validarJWT, getGlobalDashboardStats);

module.exports = router;
