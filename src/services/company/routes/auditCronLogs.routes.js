/*
    Path: '/api/audit'
*/

const { Router } = require('express');
const { validarJWT } = require('../../../shared/middlewares/validar-jwt');
const { injectDynamicConnections } = require('../../../shared/middlewares/subdomain.middleware');
const { getAuditLogs, markAuditLogRead } = require('../controllers/auditCronLogs.controller');

const router = Router();

router.get('/', [
    validarJWT,
    injectDynamicConnections
], getAuditLogs);

router.put('/:id/read', [
    validarJWT,
    injectDynamicConnections
], markAuditLogRead);

module.exports = router;
