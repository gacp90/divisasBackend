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

/** =====================================================================
 *  GET UNREAD AUDIT COUNT
=========================================================================*/
const getUnreadAuditCount = async (req, res = response) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        const AuditCronLogs = getAuditCronLogsModel(req.companyDb);

        const count = await AuditCronLogs.countDocuments({
            estadoFinal: 'Requiere Revisión Administrativa'
        });

        res.json({
            ok: true,
            count
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
 *  GET AUDIT STATS
=========================================================================*/
/** =====================================================================
 *  GET AUDIT STATS
=========================================================================*/
const getAuditStats = async (req, res = response) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        const AuditCronLogs = getAuditCronLogsModel(req.companyDb);

        const nowBogota = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
        
        const startOfDay = new Date(nowBogota);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(nowBogota);
        endOfDay.setHours(23, 59, 59, 999);

        const aggregateStats = await AuditCronLogs.aggregate([
            {
                $facet: {
                    pendientes: [
                        { $group: { _id: null, total: { $sum: { $subtract: ["$totalTraslados", "$trasladosResueltos"] } } } }
                    ],
                    resueltasHoy: [
                        { $match: { updatedAt: { $gte: startOfDay, $lte: endOfDay } } },
                        { $group: { _id: null, total: { $sum: "$trasladosResueltos" } } }
                    ],
                    cierresHoy: [
                        { $match: { fechaCierreAuto: { $gte: startOfDay, $lte: endOfDay }, accionCron: 'Cierre Automático Forzado' } },
                        { $count: "total" }
                    ]
                }
            }
        ]);

        const pendientes = aggregateStats[0].pendientes[0]?.total || 0;
        const resueltasHoy = aggregateStats[0].resueltasHoy[0]?.total || 0;
        const cierresHoy = aggregateStats[0].cierresHoy[0]?.total || 0;

        res.json({
            ok: true,
            stats: {
                pendientes,
                resueltasHoy,
                cierresHoy
            }
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
 *  GET AUDIT LOG DETALLES (VISOR HISTORICO)
=========================================================================*/
const getAuditLogDetalles = async (req, res = response) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        const AuditCronLogs = getAuditCronLogsModel(req.companyDb);
        const logId = req.params.id;

        const log = await AuditCronLogs.findById(logId);
        if (!log) return res.status(404).json({ ok: false, msg: 'Log no encontrado' });

        const trasladosIds = log.trasladosInvolucrados;
        if (!trasladosIds || trasladosIds.length === 0) {
            return res.json({ ok: true, detalles: [] });
        }

        const getBranchModel = require('../../company/models/branch.model');
        const Branch = getBranchModel(req.companyDb);
        const branchData = await Branch.findOne({ name: log.sucursal });

        let detalles = [];

        // Buscar externos en companyDb
        const getTrasladosSucursalesModel = require('../../company/models/trasladosSucursales.model');
        const TrasladosSucursales = getTrasladosSucursalesModel(req.companyDb);
        const externos = await TrasladosSucursales.find({ _id: { $in: trasladosIds } });
        
        detalles.push(...externos.map(t => ({ ...t.toJSON(), tipo: 'EXTERNO' })));

        // Buscar internos si encontramos la sucursal
        if (branchData) {
            const { getBranchConnection } = require('../../../shared/database/connection');
            const subdominio = req.headers['x-subdomain'] || '';
            const branchDb = getBranchConnection(subdominio, branchData.path);
            const getTrasladoModel = require('../../branch/models/traslados.model');
            const Traslado = getTrasladoModel(branchDb);
            
            const internos = await Traslado.find({ _id: { $in: trasladosIds } })
                .populate('emisor')
                .populate('receptor');
                
            detalles.push(...internos.map(t => ({ ...t.toJSON(), tipo: 'INTERNO' })));
        }

        res.json({
            ok: true,
            detalles
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ ok: false, msg: 'Error inesperado al obtener detalles' });
    }
};

module.exports = {
    getAuditLogs,
    markAuditLogRead,
    getUnreadAuditCount,
    getAuditStats,
    getAuditLogDetalles
};
