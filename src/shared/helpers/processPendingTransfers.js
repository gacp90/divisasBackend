const getTrasladoModel = require('../../services/branch/models/traslados.model');
const getTrasladosSucursalesModel = require('../../services/company/models/trasladosSucursales.model');
const getAuditCronLogsModel = require('../../services/company/models/auditCronLogs.model');

const processPendingTransfersForTurno = async (turno, branchDb, companyDb, subdominio, sucursalOrigenName) => {
    try {
        const Traslado = getTrasladoModel(branchDb);
        const TrasladosSucursales = getTrasladosSucursalesModel(companyDb);
        const AuditCronLogs = getAuditCronLogsModel(companyDb);

        const turnoId = String(turno._id);

        // Buscar internos
        const internos = await Traslado.find({
            $or: [{ turnoEmisor: turnoId }, { turnoReceptor: turnoId }],
            pendiente: true
        });

        // Buscar externos
        const externos = await TrasladosSucursales.find({
            $or: [{ turnoEmisorId: turnoId }, { turnoReceptorId: turnoId }],
            pendiente: true
        });

        const totalPendientes = internos.length + externos.length;

        if (totalPendientes > 0) {
            console.log(`[CRON TURNOS] Turno ${turnoId} tiene ${totalPendientes} traslados pendientes. Pasando a requiereRevision.`);

            let valorTotalCOP = 0;
            let trasladosIds = [];

            // Procesar internos
            for (let t of internos) {
                // Solo si no habia sido revisado
                if (!t.requiereRevision) {
                    t.requiereRevision = true;
                    // Valor en COP (si alguno de los montos es COP, lo sumamos. En internos usualmente no hay montoCOP directo, sumamos el monto entregado si es COP. Pero para simplificar sumamos todo)
                    // Para mayor precision, buscamos el valor
                    valorTotalCOP += t.montoRecibido || t.montoEntregado;
                    trasladosIds.push(String(t._id));
                    await t.save();
                }
            }

            // Procesar externos
            for (let t of externos) {
                if (!t.requiereRevision) {
                    t.requiereRevision = true;
                    if (t.monedaEntregadaCode === 'COP') {
                        valorTotalCOP += t.montoEntregado;
                    } else if (t.monedaRecibidaCode === 'COP') {
                        valorTotalCOP += t.montoRecibido;
                    }
                    trasladosIds.push(String(t._id));
                    await t.save();
                }
            }

            if (trasladosIds.length > 0) {
                // Crear Log de Auditoria
                const userName = turno.user ? (turno.user.name || turno.user.username || String(turno.user)) : 'Usuario Desconocido';
                
                const auditLog = new AuditCronLogs({
                    turnoId: turnoId,
                    fechaApertura: turno.open,
                    fechaCierreAuto: new Date(),
                    usuario: userName,
                    sucursal: sucursalOrigenName || 'Sucursal Desconocida',
                    trasladosInvolucrados: trasladosIds,
                    valorTotalCOP: valorTotalCOP,
                    estadoOriginal: 'Pendiente',
                    estadoFinal: 'Requiere Revisión Administrativa',
                    accionCron: 'Cierre Automático Forzado'
                });

                await auditLog.save();
            }
        }
    } catch (error) {
        console.error('[processPendingTransfersForTurno] Error procesando traslados para el turno:', error);
    }
};

module.exports = {
    processPendingTransfersForTurno
};
