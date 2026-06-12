const { response } = require('express');
const getTrasladosSucursalesModel = require('../models/trasladosSucursales.model');
const { getBranchConnection } = require('../../../shared/database/connection');
const getTurnosModel = require('../../branch/models/turnos.model');

/** =====================================================================
 *  CREATE TRASLADO ENTRE SUCURSALES
=========================================================================*/
const getInventoryModel = require('../../branch/models/inventory.model');

const createTrasladoSucursal = async (req, res = response) => {
    const uid = req.uid;

    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        
        // Bloqueo estricto de COP para envío (solo se puede recibir COP como pago de divisa)
        if (req.body.monedaEntregadaCode === 'COP') {
            return res.status(400).json({
                ok: false,
                msg: 'OPERACIÓN RECHAZADA: No está permitido el traslado (envío) de moneda local (COP) hacia otras sucursales.'
            });
        }

        const { sucursalDestinoId, turnoEmisorId, turnoReceptorId, montoEntregado, montoRecibido, monedaEntregada, monedaRecibida } = req.body;

        const subdomain = req.headers['x-subdomain'] || '';
        const BranchModel = require('../../company/models/branch.model')(req.companyDb);
        const branchOrigen = await BranchModel.findOne({ path: req.headers['x-branch'] });
        const branchDestino = await BranchModel.findById(sucursalDestinoId);
        
        if (!branchOrigen || !branchDestino) {
            return res.status(400).json({ ok: false, msg: `Error de sucursales: Origen (${!!branchOrigen}) Destino (${!!branchDestino}) Path token (${req.branchPathToken}) DestinoId (${sucursalDestinoId})` });
        }
        
        const sucursalOrigenId = branchOrigen._id.toString();

        if (sucursalOrigenId === sucursalDestinoId) {
            return res.status(400).json({
                ok: false,
                msg: 'Debe especificar una sucursal destino diferente a la sucursal de origen.'
            });
        }
        
        // Conexiones a las Branch DB
        const dbOrigen = getBranchConnection(subdomain, branchOrigen.path);
        const dbDestino = getBranchConnection(subdomain, branchDestino.path);

        // Esperar conexión
        if (dbOrigen.readyState !== 1) await dbOrigen.asPromise();
        if (dbDestino.readyState !== 1) await dbDestino.asPromise();

        const TurnoOrigen = getTurnosModel(dbOrigen);
        const TurnoDestino = getTurnosModel(dbDestino);
        const InventoryOrigen = getInventoryModel(dbOrigen);
        const InventoryDestino = getInventoryModel(dbDestino);

        const tEmisor = await TurnoOrigen.findById(turnoEmisorId);
        const tReceptor = await TurnoDestino.findById(turnoReceptorId);

        if (!tEmisor || !tReceptor) {
            return res.status(404).json({ ok: false, msg: 'No se encontraron los turnos en las sucursales respectivas.' });
        }

        // Obtener códigos de moneda para mapear IDs entre sucursales
        const invOrigenEntregada = await InventoryOrigen.findById(monedaEntregada);
        const invOrigenRecibida = await InventoryOrigen.findOne({ code: req.body.monedaRecibidaCode || 'COP' });
        
        if (!invOrigenEntregada || !invOrigenRecibida) {
            return res.status(400).json({ ok: false, msg: 'No se encontraron las monedas en la sucursal origen.' });
        }

        const invDestinoEntregada = await InventoryDestino.findOne({ code: invOrigenEntregada.code });
        const invDestinoRecibida = await InventoryDestino.findOne({ code: req.body.monedaRecibidaCode || 'COP' });

        if (!invDestinoEntregada || !invDestinoRecibida) {
            return res.status(400).json({ ok: false, msg: 'La sucursal destino no tiene configuradas estas monedas (divisas).' });
        }

        const mEntregado = Number(montoEntregado);
        const mRecibido = Number(montoRecibido);

        // LOGICA DE DESCUENTO EN ORIGEN (usando IDs de Origen)
        let idxEmisorEntregada = tEmisor.saldos.findIndex(s => String(s.moneda) === String(invOrigenEntregada._id));
        let idxEmisorRecibida = tEmisor.saldos.findIndex(s => String(s.moneda) === String(invOrigenRecibida._id));

        if (idxEmisorRecibida === -1) {
            tEmisor.saldos.push({ moneda: invOrigenRecibida._id, montoInicial: 0, saldoActual: 0, tasaInicial: 1 });
            idxEmisorRecibida = tEmisor.saldos.length - 1; 
        }

        if (idxEmisorEntregada === -1 || tEmisor.saldos[idxEmisorEntregada].saldoActual < mEntregado) {
            return res.status(400).json({ ok: false, msg: `No tienes saldo suficiente en la sucursal origen. Intentas enviar ${mEntregado}.` });
        }

        // LOGICA DE INCREMENTO EN DESTINO (usando IDs de Destino)
        let idxReceptorEntregada = tReceptor.saldos.findIndex(s => String(s.moneda) === String(invDestinoEntregada._id));
        let idxReceptorRecibida = tReceptor.saldos.findIndex(s => String(s.moneda) === String(invDestinoRecibida._id));

        if (idxReceptorEntregada === -1) {
            tReceptor.saldos.push({ moneda: invDestinoEntregada._id, montoInicial: 0, saldoActual: 0, tasaInicial: 1 });
            idxReceptorEntregada = tReceptor.saldos.length - 1;
        }

        // Si el traslado no es "pendiente", verificamos que el receptor tenga saldo para enviar la contraparte
        if (req.body.pendiente === false) {
             if (idxReceptorRecibida === -1 || tReceptor.saldos[idxReceptorRecibida].saldoActual < mRecibido) {
                return res.status(400).json({ ok: false, msg: 'El receptor en la sucursal destino no tiene saldo suficiente para la contraparte, o debe marcar el traslado como PENDIENTE.' });
            }
            // Receptor entrega la contraparte (Caja)
            tReceptor.saldos[idxReceptorRecibida].saldoActual -= mRecibido;
            tEmisor.saldos[idxEmisorRecibida].saldoActual += mRecibido;

            // ACTUALIZACIÓN DE INVENTARIO GLOBAL COP
            invDestinoRecibida.amount -= mRecibido;
            invOrigenRecibida.amount += mRecibido;
        }

        // Descontamos del emisor y sumamos al receptor la divisa original (Caja)
        tEmisor.saldos[idxEmisorEntregada].saldoActual -= mEntregado; 
        tReceptor.saldos[idxReceptorEntregada].saldoActual += mEntregado; 

        // ==============================================================
        // ACTUALIZACIÓN DE INVENTARIO GLOBAL DIVISA Y WAC (tpc)
        // ==============================================================
        
        // 1. Descuento en Sucursal Origen (No altera WAC)
        invOrigenEntregada.amount -= mEntregado;

        // 2. Incremento en Sucursal Destino y Recálculo de WAC
        const existenciaAnteriorDestino = invDestinoEntregada.amount;
        const tpcActualDestino = invDestinoEntregada.tpc || 0;
        const tasaPactada = mRecibido / mEntregado;

        invDestinoEntregada.amount += mEntregado;

        if (invDestinoEntregada.amount > 0) {
            // Promedio Ponderado Móvil usando la tasa pactada del traslado
            invDestinoEntregada.tpc = ((existenciaAnteriorDestino * tpcActualDestino) + (mEntregado * tasaPactada)) / invDestinoEntregada.amount;
        }

        tEmisor.markModified('saldos');
        tReceptor.markModified('saldos');

        // GUARDAR TURNOS EN SUS RESPECTIVAS DB Y LOS INVENTARIOS ACTUALIZADOS
        await Promise.all([
            tEmisor.save(), 
            tReceptor.save(),
            invOrigenEntregada.save(),
            invOrigenRecibida.save(),
            invDestinoEntregada.save(),
            invDestinoRecibida.save()
        ]);

        // GUARDAR REGISTRO CORPORATIVO EN COMPANY DB
        const TrasladosSucursales = getTrasladosSucursalesModel(req.companyDb);
        req.body.emisorId = uid;
        req.body.sucursalOrigenId = sucursalOrigenId;
        
        const trasladoNew = new TrasladosSucursales(req.body);
        await trasladoNew.save();

        res.json({
            ok: true,
            traslado: trasladoNew
        });

    } catch (error) {
        require('fs').appendFileSync('d:/PROYECTO DE SOFTWARE/SIMIDMAS/error.log', new Date().toISOString() + '\n' + error.stack + '\n\n');
        console.error('Error en createTrasladoSucursal:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno al procesar el traslado entre sucursales', error: error.message, stack: error.stack
        });
    }
};

/** =====================================================================
 *  GET TRASLADOS CORPORATIVOS
=========================================================================*/
const getTrasladosSucursalesQuery = async(req, res) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        const TrasladosSucursales = getTrasladosSucursalesModel(req.companyDb);

        const { desde, hasta, sort, ...query } = req.body;

        let matchQuery = { ...query };
        if (query.turnoEmisorId) {
            matchQuery = {
                $or: [
                    { turnoEmisorId: query.turnoEmisorId },
                    { emisorId: req.uid, pendiente: true, requiereRevision: true }
                ]
            };
        } else if (query.turnoReceptorId) {
            matchQuery = {
                $or: [
                    { turnoReceptorId: query.turnoReceptorId },
                    { receptorId: req.uid, pendiente: true, requiereRevision: true }
                ]
            };
        }

        const [traslados, total] = await Promise.all([
            TrasladosSucursales.find(matchQuery)
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            TrasladosSucursales.countDocuments(matchQuery)
        ]);

        const getBranchModel = require('../models/branch.model');
        const getUserModel = require('../models/users.model');
        const Branch = getBranchModel(req.companyDb);
        const UserCompany = getUserModel(req.companyDb);

        const enrichedTraslados = await Promise.all(traslados.map(async (t) => {
            const obj = t.toJSON();
            const [emisor, receptor, sucOrigen, sucDestino] = await Promise.all([
                UserCompany.findById(t.emisorId).catch(() => null),
                UserCompany.findById(t.receptorId).catch(() => null),
                Branch.findById(t.sucursalOrigenId).catch(() => null),
                Branch.findById(t.sucursalDestinoId).catch(() => null)
            ]);
            obj.emisorName = emisor ? emisor.name : t.emisorId;
            obj.receptorName = receptor ? receptor.name : t.receptorId;
            obj.sucursalOrigenName = sucOrigen ? sucOrigen.name : t.sucursalOrigenId;
            obj.sucursalDestinoName = sucDestino ? sucDestino.name : t.sucursalDestinoId;
            return obj;
        }));

        res.json({
            ok: true,
            traslados: enrichedTraslados,
            total
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }
};


const getMovimientoModel = require('../../branch/models/movimientos.model');

/** =====================================================================
 *  UPDATE TRASLADO CORPORATIVO (PAGADO)
=========================================================================*/
const updateTrasladoSucursal = async(req, res) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        const TrasladosSucursales = getTrasladosSucursalesModel(req.companyDb);

        const trasladoId = req.params.id;
        const trasladoPrevio = await TrasladosSucursales.findById(trasladoId);
        if (!trasladoPrevio) return res.status(404).json({ ok: false, msg: 'No se encontró el traslado especificado' });

        const subdominio = req.headers['x-subdomain'] || '';
        if (!subdominio) return res.status(400).json({ ok: false, msg: 'Falta subdominio' });

        const Branch = require('../models/branch.model')(req.companyDb);
        const [sucOrigen, sucDestino] = await Promise.all([
            Branch.findById(trasladoPrevio.sucursalOrigenId),
            Branch.findById(trasladoPrevio.sucursalDestinoId)
        ]);

        if (!sucOrigen || !sucDestino) return res.status(404).json({ ok: false, msg: 'Sucursales no encontradas' });

        // Si se va a marcar como PAGADO desde el panel de Auditoria (o cajero) y el traslado estaba pendiente
        if (req.body.accion === 'PAGADO' || req.body.pendiente === false) {

            // Validaciones de protección adicional (Punto 4)
            if (trasladoPrevio.pendiente === false && trasladoPrevio.requiereRevision === false) {
                return res.status(400).json({ ok: false, msg: 'El traslado ya fue resuelto previamente.' });
            }

            const dbDestino = getBranchConnection(subdominio, sucDestino.path);
            const dbOrigen = getBranchConnection(subdominio, sucOrigen.path);

            const InventoryDestino = getInventoryModel(dbDestino);
            const InventoryOrigen = getInventoryModel(dbOrigen);
            const MovimientoDestino = getMovimientoModel(dbDestino);
            const MovimientoOrigen = getMovimientoModel(dbOrigen);

            const [invDestinoCOP, invOrigenCOP] = await Promise.all([
                InventoryDestino.findOne({ code: 'COP' }),
                InventoryOrigen.findOne({ code: 'COP' })
            ]);

            if (!invDestinoCOP) return res.status(404).json({ ok: false, msg: 'No existe inventario COP en la sucursal deudora' });

            // Validación estricta de fondos
            const montoRequerido = Number(trasladoPrevio.montoRecibido); // La cantidad de COP pactada
            if (invDestinoCOP.amount < montoRequerido) {
                return res.status(400).json({ 
                    ok: false, 
                    msg: `No es posible registrar el pago. La sucursal deudora posee ${invDestinoCOP.amount} COP disponibles y el traslado requiere ${montoRequerido} COP.` 
                });
            }

            // Mover el COP globalmente
            const inventoryDestinoPrevio = invDestinoCOP.amount;
            const inventoryOrigenPrevio = invOrigenCOP ? invOrigenCOP.amount : 0;

            invDestinoCOP.amount -= montoRequerido;
            if (invOrigenCOP) {
                invOrigenCOP.amount += montoRequerido;
            } else {
                // Crear inventario COP en origen si no existe
                const nuevoInv = new InventoryOrigen({
                    code: 'COP', currency: 'Pesos', amount: montoRequerido, tc: 1, tv: 1, tbc: 1
                });
                await nuevoInv.save();
            }

            // Generar Movimientos (Auditoría en bóveda)
            const movDestino = new MovimientoDestino({
                user: req.uid,
                type: 'Salida',
                description: `Pago tardío traslado externo #${trasladoPrevio.trasladoId || trasladoPrevio._id}`,
                amount: montoRequerido
            });

            const movOrigen = new MovimientoOrigen({
                user: req.uid,
                type: 'Entrada',
                description: `Cobro tardío traslado externo #${trasladoPrevio.trasladoId || trasladoPrevio._id}`,
                amount: montoRequerido
            });

            // Guardar bases de datos de sucursales
            await Promise.all([
                invDestinoCOP.save(),
                invOrigenCOP ? invOrigenCOP.save() : Promise.resolve(),
                movDestino.save(),
                movOrigen.save()
            ]);

            // Actualizar Traslado global
            req.body.pendiente = false;
            req.body.requiereRevision = false;
            const getUserModel = require('../models/users.model');
            const UserCompany = getUserModel(req.companyDb);
            const userExec = await UserCompany.findById(req.uid);
            const userName = userExec ? userExec.name : req.uid;
            const userRole = userExec ? userExec.role : (req.userRole || 'ADMINISTRADOR');

            // Agregar historial
            let historialItem = {
                fecha: new Date(),
                usuario: userName,
                rolUsuario: userRole,
                accion: 'PAGADO',
                nota: req.body.nota || `Pago administrativo ejecutado. Destino previo COP: ${inventoryDestinoPrevio}, Destino final COP: ${invDestinoCOP.amount}. Origen previo COP: ${inventoryOrigenPrevio}, Origen final COP: ${invOrigenCOP ? invOrigenCOP.amount : montoRequerido}.`,
                estadoAnterior: 'Requiere Revisión Administrativa',
                estadoNuevo: 'Pagado'
            };
            req.body.$push = { historialRevision: historialItem };
            delete req.body.accion;
            delete req.body.nota;

            const getAuditCronLogsModel = require('../models/auditCronLogs.model');
            const AuditCronLogs = getAuditCronLogsModel(req.companyDb);
            await AuditCronLogs.updateMany(
                { trasladosInvolucrados: String(trasladoId) },
                { $inc: { trasladosResueltos: 1 } }
            );

        } else if (req.body.accion === 'MANTENER_PENDIENTE') {
            const getUserModel = require('../models/users.model');
            const UserCompany = getUserModel(req.companyDb);
            const userExec = await UserCompany.findById(req.uid);
            const userName = userExec ? userExec.name : req.uid;
            const userRole = userExec ? userExec.role : (req.userRole || 'ADMINISTRADOR');

            let historialItem = {
                fecha: new Date(),
                usuario: userName,
                rolUsuario: userRole,
                accion: 'MANTENER_PENDIENTE',
                nota: req.body.nota || 'Pendiente mantenido',
                estadoAnterior: 'Requiere Revisión Administrativa',
                estadoNuevo: 'Requiere Revisión Administrativa'
            };
            req.body.$push = { historialRevision: historialItem };
            delete req.body.accion;
            delete req.body.nota;
            // Retenemos los estados
            req.body.pendiente = true;
            req.body.requiereRevision = true;
        }

        const trasladoUpdate = await TrasladosSucursales.findByIdAndUpdate(trasladoId, req.body, { new: true });

        res.json({
            ok: true,
            traslado: trasladoUpdate
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ ok: false, msg: 'Error inesperado' });
    }
};

/** =====================================================================
 *  GET TURNOS ACTIVOS GLOBAL
=========================================================================*/
const getBranchModel = require('../models/branch.model');
const getUserModel = require('../models/users.model');

const getTurnosGlobal = async(req, res) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        
        const Branch = getBranchModel(req.companyDb);
        const UserCompany = getUserModel(req.companyDb);
        const branches = await Branch.find({ isActive: true });

        const subdominio = req.headers['x-subdomain'] || '';
        if (!subdominio) return res.status(400).json({ ok: false, msg: 'No se pudo detectar el subdominio' });

        let turnosGlobales = [];

        const currentBranchPath = req.headers['x-branch'] || '';
        for (const branch of branches) {
            if (currentBranchPath && branch.path.toLowerCase() === currentBranchPath.toLowerCase()) continue;
            try {
                const branchDb = getBranchConnection(subdominio, branch.path);
                if (branchDb.readyState !== 1) await branchDb.asPromise();
                const TurnoLocal = getTurnosModel(branchDb);

                const InventarioLocal = getInventoryModel(branchDb);
                const turnosActivos = await TurnoLocal.find({ abierto: true }).populate([
                    { path: 'saldos.moneda', model: InventarioLocal }
                ]);

                const turnosMapeados = await Promise.all(turnosActivos.map(async t => {
                    const obj = t.toJSON();
                    obj._id = t._id; // Mongoose toJSON remueve _id y pone turid
                    obj.branchId = branch._id;
                    obj.branchName = branch.name;
                    
                    if (t.user) {
                        const userGlobal = await UserCompany.findById(t.user);
                        if (userGlobal) {
                            obj.user = { _id: userGlobal._id, name: userGlobal.name, user: userGlobal.user, role: userGlobal.role };
                        } else {
                            obj.user = { _id: t.user, name: 'Cajero', role: 'Desconocido' };
                        }
                    }
                    return obj;
                }));

                turnosGlobales = [...turnosGlobales, ...turnosMapeados];
            } catch (err) {
                console.warn(`No se pudieron cargar turnos de sucursal ${branch.name}:`, err);
            }
        }

        res.json({
            ok: true,
            turnos: turnosGlobales,
            total: turnosGlobales.length
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ ok: false, msg: 'Error inesperado consultando turnos globales' });
    }
};

/** =====================================================================
 *  GET TRASLADOS INTERNOS GLOBAL (AUDITORIA)
=========================================================================*/
const getTrasladoModel = require('../../branch/models/traslados.model');

const getTrasladosInternosGlobal = async(req, res) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto Company DB' });
        
        const Branch = getBranchModel(req.companyDb);
        const UserCompany = getUserModel(req.companyDb);
        const branches = await Branch.find({ isActive: true });

        const subdominio = req.headers['x-subdomain'] || '';
        if (!subdominio) return res.status(400).json({ ok: false, msg: 'No se pudo detectar el subdominio' });

        let trasladosInternosGlobales = [];

        for (const branch of branches) {
            try {
                const branchDb = getBranchConnection(subdominio, branch.path);
                if (branchDb.readyState !== 1) await branchDb.asPromise();
                const TrasladoLocal = getTrasladoModel(branchDb);

                const trasladosBranch = await TrasladoLocal.find({ requiereRevision: true });

                const mapeados = await Promise.all(trasladosBranch.map(async t => {
                    const obj = t.toJSON();
                    obj._id = t._id;
                    obj.branchId = branch._id;
                    obj.branchPath = branch.path; // Permite al frontend enviar el x-branch
                    obj.sucursalOrigenName = branch.name;
                    obj.sucursalDestinoName = branch.name;
                    
                    const [emisor, receptor] = await Promise.all([
                        UserCompany.findById(t.emisor).catch(() => null),
                        UserCompany.findById(t.receptor).catch(() => null)
                    ]);

                    obj.emisorName = emisor ? emisor.name : t.emisor;
                    obj.receptorName = receptor ? receptor.name : t.receptor;

                    return obj;
                }));

                trasladosInternosGlobales = [...trasladosInternosGlobales, ...mapeados];
            } catch (err) {
                console.warn(`No se pudieron cargar traslados internos de sucursal ${branch.name}:`, err);
            }
        }

        res.json({
            ok: true,
            traslados: trasladosInternosGlobales,
            total: trasladosInternosGlobales.length
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ ok: false, msg: 'Error inesperado consultando traslados internos globales' });
    }
};

// EXPORTS
module.exports = {
    createTrasladoSucursal,
    getTrasladosSucursalesQuery,
    updateTrasladoSucursal,
    getTurnosGlobal,
    getTrasladosInternosGlobal
};

