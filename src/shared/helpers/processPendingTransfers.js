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

        const userName = turno.user ? (turno.user.name || turno.user.username || String(turno.user)) : 'Usuario Desconocido';
        const userRole = turno.user ? turno.user.role : 'DESCONOCIDO';

        if (totalPendientes > 0) {
            console.log(`[CRON TURNOS] Turno ${turnoId} tiene ${totalPendientes} traslados pendientes. Pasando a requiereRevision.`);

            let valorTotalCOP = 0;
            let trasladosIds = [];

            // Procesar internos
            for (let t of internos) {
                if (!t.requiereRevision) {
                    t.requiereRevision = true;
                    valorTotalCOP += t.montoRecibido || t.montoEntregado;
                    trasladosIds.push(String(t._id));
                }

                // Guardar metadatos operativos en la raíz del documento
                t.fechaCierreAutomatico = new Date();
                t.motivoRevision = 'Turno cerrado automáticamente. Pasando a revisión administrativa.';

                // Inyectar firma del Cron si no existe, garantizando que no se duplique
                const yaCerradoPorCron = t.historialRevision.some(h => h.rolUsuario === 'CRON');
                if (!yaCerradoPorCron) {
                    t.historialRevision.push({
                        fecha: new Date(),
                        usuario: 'SISTEMA',
                        rolUsuario: 'CRON',
                        accion: 'CIERRE AUTOMÁTICO CRON',
                        nota: t.motivoRevision,
                        estadoAnterior: 'Pendiente',
                        estadoNuevo: 'Requiere Revisión Administrativa'
                    });
                }
                
                await t.save();
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
                }

                // Guardar metadatos operativos en la raíz del documento
                t.fechaCierreAutomatico = new Date();
                t.motivoRevision = 'Turno cerrado automáticamente. Pasando a revisión administrativa.';

                // Inyectar firma del Cron si no existe, garantizando que no se duplique
                const yaCerradoPorCron = t.historialRevision.some(h => h.rolUsuario === 'CRON');
                if (!yaCerradoPorCron) {
                    t.historialRevision.push({
                        fecha: new Date(),
                        usuario: 'SISTEMA',
                        rolUsuario: 'CRON',
                        accion: 'CIERRE AUTOMÁTICO CRON',
                        nota: t.motivoRevision,
                        estadoAnterior: 'Pendiente',
                        estadoNuevo: 'Requiere Revisión Administrativa'
                    });
                }
                
                await t.save();
            }

            if (trasladosIds.length > 0) {
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
                    accionCron: 'Cierre Automático Forzado',
                    leido: false,
                    totalTraslados: trasladosIds.length,
                    trasladosResueltos: 0
                });

                await auditLog.save();
            }
        } else {
            // No hay pendientes
            if (userRole === 'CAJERO') {
                const auditLog = new AuditCronLogs({
                    turnoId: turnoId,
                    fechaApertura: turno.open,
                    fechaCierreAuto: new Date(),
                    usuario: userName,
                    sucursal: sucursalOrigenName || 'Sucursal Desconocida',
                    trasladosInvolucrados: [],
                    valorTotalCOP: 0,
                    estadoOriginal: 'Normal',
                    estadoFinal: 'Cerrado Limpio',
                    accionCron: 'Cierre Automático',
                    leido: true // Marcar como leido para que no dispare alerta
                });

                await auditLog.save();
                console.log(`[CRON TURNOS] Turno ${turnoId} de CAJERO cerrado sin incidentes (Cerrado Limpio).`);
            }
        }
    } catch (error) {
        console.error('[processPendingTransfersForTurno] Error procesando traslados para el turno:', error);
    }
};

module.exports = {
    processPendingTransfersForTurno
};
