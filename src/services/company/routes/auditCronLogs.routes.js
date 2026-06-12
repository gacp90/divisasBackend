/*
    Path: '/api/audit'
*/

const { Router } = require('express');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');
const { validarRoleAdmin } = require('../../../shared/middlewares/validar-role-admin');
const { injectDynamicConnections } = require('../../../shared/middlewares/subdomain.middleware');
const { getAuditLogs, markAuditLogRead, getUnreadAuditCount, getAuditStats, getAuditLogDetalles } = require('../controllers/auditCronLogs.controller');

const router = Router();

router.get('/stats', [
    validarJWT,
    validarRoleAdmin,
    injectDynamicConnections
], getAuditStats);

router.get('/:id/detalles', [
    validarJWT,
    validarRoleAdmin,
    injectDynamicConnections
], getAuditLogDetalles);

router.get('/unread', [
    validarJWT,
    validarRoleAdmin,
    injectDynamicConnections
], getUnreadAuditCount);

router.get('/', [
    validarJWT,
    validarRoleAdmin,
    injectDynamicConnections
], getAuditLogs);

router.put('/:id/read', [
    validarJWT,
    validarRoleAdmin,
    injectDynamicConnections
], markAuditLogRead);

module.exports = router;
