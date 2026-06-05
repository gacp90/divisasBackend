const { response } = require('express');
const getAuditCronLogsModel = require('../models/auditCronLogs.model');

/** =====================================================================
 *  GET AUDIT LOGS
=========================================================================*/
const getAuditLogs = async (req, res = response) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        const AuditCronLogs = getAuditCronLogsModel(req.companyDb);

        const logs = await AuditCronLogs.find().sort({ fechaCierreAuto: -1 });

        res.json({
            ok: true,
            logs
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }
};

/** =====================================================================
 *  MARK AS READ
=========================================================================*/
const markAuditLogRead = async (req, res = response) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        const AuditCronLogs = getAuditCronLogsModel(req.companyDb);

        const logId = req.params.id;
        const log = await AuditCronLogs.findByIdAndUpdate(logId, { leido: true }, { new: true });

        if (!log) {
            return res.status(404).json({ ok: false, msg: 'No se encontró el log' });
        }

        res.json({
            ok: true,
            log
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }
};

module.exports = {
    getAuditLogs,
    markAuditLogRead
};
