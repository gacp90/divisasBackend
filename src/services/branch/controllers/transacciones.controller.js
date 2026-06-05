const { response } = require('express');

const getTransaccionModel = require('../models/transacciones.model');
const getInventoryModel = require('../models/inventory.model');
const getUserModel = require('../../company/models/users.model');
const getTurnoModel = require('../models/turnos.model');
const getClientModel = require('../../company/models/clients.model');
const getBranchModel = require('../../company/models/branch.model');
const { getBranchConnection } = require('../../../shared/database/connection');

const { concecutive } = require('../helpers/concecutive');
const { updateInventoryAmount, revertInventoryAmount } = require('../helpers/update-inventory');
const { enviarFacturaConexus, enviarNotaCreditoConexus } = require('../../../shared/helpers/conexus');

/** ======================================================================
 *  GET Transaccion
=========================================================================*/
const getTransaccionesQuery = async(req, res = response) => {

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Transaccion = getTransaccionModel(req.branchDb);
        const ClientCompany = getClientModel(req.companyDb);
        const UserCompany = getUserModel(req.companyDb);

        const { desde, hasta, sort, ...query } = req.body;

        const [transacciones, total] = await Promise.all([
            Transaccion.find(query)
            .populate({
                path: 'client',
                model: ClientCompany,
                populate: {
                    path: 'representante',
                    model: ClientCompany
                }
            })
            .populate({ path: 'cajero', model: UserCompany })
            .populate({ path: 'declarant', model: ClientCompany })
            .populate({ path: 'userCancel', model: UserCompany })
            .populate('items.moneda')
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Transaccion.countDocuments(query)
        ])

        res.json({
            ok: true,
            transacciones,
            total
        });

    } catch (error) {
        console.log('OUTER ERROR:', error); const fs = require('fs'); fs.writeFileSync('d:/PROYECTO DE SOFTWARE/SIMIDMAS/diviBackend/error_log_outer.txt', String(error.stack || error));
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });

    }
};

/** ======================================================================
 *  GET Transacciones Globales de Cliente (Multi-sucursal)
=========================================================================*/
const getTransaccionesQueryGlobal = async(req, res = response) => {
    try {
        if (!req.companyDb) return res.status(400).json({ ok: false, msg: 'Falta contexto compañía' });
        
        const Branch = getBranchModel(req.companyDb);
        const ClientCompany = getClientModel(req.companyDb);
        const UserCompany = getUserModel(req.companyDb);
        
        const { desde, hasta, sort, ...query } = req.body;
        
        // Obtener el subdominio desde el nombre de la DB (ej: 'company_simid' -> 'simid')
        const companyDbName = req.companyDb.name || '';
        const subdominio = companyDbName.split('_')[1];

        if (!subdominio) {
            return res.status(400).json({ ok: false, msg: 'No se pudo detectar el subdominio de la compañía' });
        }

        // Obtener todas las sucursales activas de la empresa
        const branches = await Branch.find({ isActive: true });
        
        let transaccionesGlobales = [];

        // Iterar sobre cada sucursal para extraer las transacciones
        for (const branch of branches) {
            try {
                const branchDb = getBranchConnection(subdominio, branch.path);
                const Transaccion = getTransaccionModel(branchDb);
                const Inventory = getInventoryModel(branchDb);

                const transaccionesSucursal = await Transaccion.find(query)
                    .populate({
                        path: 'client',
                        model: ClientCompany,
                        populate: {
                            path: 'representante',
                            model: ClientCompany
                        }
                    })
                    .populate({ path: 'cajero', model: UserCompany })
                    .populate({ path: 'declarant', model: ClientCompany })
                    .populate({ path: 'userCancel', model: UserCompany })
                    .populate({ path: 'items.moneda', model: Inventory });

                transaccionesGlobales = [...transaccionesGlobales, ...transaccionesSucursal];
            } catch (err) {
                console.warn(`No se pudieron cargar transacciones de la sucursal ${branch.name}:`, err.message);
            }
        }

        // Ordenar y paginar el arreglo unificado
        if (sort && sort.fecha === -1) {
            transaccionesGlobales.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        } else if (sort && sort.fecha === 1) {
            transaccionesGlobales.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        }
        
        const total = transaccionesGlobales.length;
        const dsd = Number(desde) || 0;
        const hst = Number(hasta) || total;
        
        const paginadas = transaccionesGlobales.slice(dsd, dsd + hst);

        res.json({
            ok: true,
            transacciones: paginadas,
            total
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado al cargar historial global, intente nuevamente'
        });
    }
};

/** =====================================================================
 *  GET Transaccion ID
=========================================================================*/
const getTransaccionId = async(req, res = response) => {

    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Transaccion = getTransaccionModel(req.branchDb);
        const ClientCompany = getClientModel(req.companyDb);
        const UserCompany = getUserModel(req.companyDb);
        const tid = req.params.id;

        const transaccionDB = await Transaccion.findById(tid)
            .populate({ path: 'client', model: ClientCompany })
            .populate({ path: 'cajero', model: UserCompany })
            .populate({ path: 'declarant', model: ClientCompany })
            .populate({ path: 'userCancel', model: UserCompany })
            .populate('items.moneda');
        if (!transaccionDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado esta transacción, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            transaccion: transaccionDB
        });


    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });
    }

};

/** =====================================================================
 *  CREATE Transaccion
=========================================================================*/
const createTransaccion = async(req, res = response) => {

    try {
        if (!req.branchDb || !req.companyDb) return res.status(400).json({ ok: false, msg: 'Faltan contextos de base de datos' });
        const Transaccion = getTransaccionModel(req.branchDb);
        const ClientCompany = getClientModel(req.companyDb);
        const UserCompany = getUserModel(req.companyDb);
        const User = getUserModel(req.branchDb);
        const Inventory = getInventoryModel(req.branchDb);

        const uid = req.uid;
        const user = await User.findById(uid)
            .populate({
                path: 'turno',
                populate: {
                    path: 'saldos.moneda',
                    model: 'Inventories'  
                }
            });
        if (!user) {
            return res.status(400).json({
                ok: false,
                msg: 'No existe ningun usuario con este ID'
            });
        }

        if (!user.turno || !user.turno.abierto) {
            return res.status(400).json({
                ok: false,
                msg: 'No tienes un turno abierto para operar. Por favor, abre uno.'
            });
        }

        // VALIDAR VIGENCIA DEL TURNO (NO PERMITIR OPERACIONES SI CAMBIÓ EL DÍA)
        if (user.turno.open) {
            const dateEnBogota = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Bogota"}));
            const turnoOpenDate = new Date(new Date(user.turno.open).toLocaleString("en-US", {timeZone: "America/Bogota"}));
            
            if (dateEnBogota.toDateString() !== turnoOpenDate.toDateString()) {
                return res.status(403).json({
                    ok: false,
                    msg: 'Tu turno ha expirado por cambio de fecha (es de un día anterior). Debes cerrarlo obligatoriamente para continuar.'
                });
            }
        }
        
        let newTransaccion = new Transaccion(req.body);
        
        // VALIDAR VALORES NEGATIVOS
        if (newTransaccion.total < 0 || newTransaccion.subtotal < 0 || newTransaccion.equivalencia < 0) {
            return res.status(400).json({ ok: false, msg: 'Error: Los valores de la transacción no pueden ser negativos.' });
        }

        if (newTransaccion.items && newTransaccion.items.length > 0) {
            for (const item of newTransaccion.items) {
                if (item.monto < 0 || item.tasa < 0) {
                    return res.status(400).json({ ok: false, msg: 'Error: Los montos y tasas de los ítems no pueden ser negativos.' });
                }
            }
        }
        
        // VERIFICAR EL TIPO DE TRANSACCION
        if (newTransaccion.transaccion === 'Compra') {

            // VERIFICAR SI HAY SALDO EN EL TURNO (GAVETA)
            const inventory = await Inventory.findOne({code: 'COP'});
            if (!inventory) {
                return res.status(400).json({ ok: false, msg: 'Moneda COP no encontrada en el inventario' });
            }

            const indexCopTurno = user.turno.saldos.findIndex(s => String(s.moneda._id) === String(inventory._id) || s.moneda.code === 'COP');
            if (indexCopTurno === -1 || user.turno.saldos[indexCopTurno].saldoActual < newTransaccion.total) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Lo sentimos, no tienes suficiente COP en tu gaveta para realizar esta compra.'
                });                
            }

            // OBTENER EL CONCECUTIVO DE LA COMPRA
            newTransaccion.number = await concecutive('Compra', req.branchDb);

            // VALIDAR EL MONTO Y OBTENER EL CONCECUTIVO DEPENDIENDO DEL MONTO
            if (newTransaccion.equivalencia > 200 && newTransaccion.equivalencia < 500) {
                // Asignar número de control para facturas entre $200 y $500
                newTransaccion.control = await concecutive('1121', req.branchDb);
            } else if (newTransaccion.equivalencia >= 500) {
                // Asignar número de control para facturas mayores a $500
                newTransaccion.control = await concecutive('1099', req.branchDb);
            }
        } else if (newTransaccion.transaccion === 'Venta') {
            // VERIFICAR SI HAY SALDO DE DIVISA EN LA GAVETA DEL CAJERO
            for (const item of newTransaccion.items) {
                const indexDivisaTurno = user.turno.saldos.findIndex(s => String(s.moneda._id) === String(item.moneda) || String(s.moneda) === String(item.moneda));
                if (indexDivisaTurno === -1 || user.turno.saldos[indexDivisaTurno].saldoActual < item.monto) {
                    return res.status(400).json({
                        ok: false,
                        msg: 'No tienes suficiente saldo de esta divisa en tu gaveta para realizar la venta.'
                    });
                }
            }

            // OBTENER EL CONCECUTIVO DE LA VENTA
            newTransaccion.number = await concecutive('Venta', req.branchDb);

            // VALIDAR EL MONTO Y OBTENER EL CONCECUTIVO DEPENDIENDO DEL MONTO
            if (newTransaccion.equivalencia > 200 && newTransaccion.equivalencia < 500) {
                // Asignar número de control para facturas entre $200 y $500
                newTransaccion.control = await concecutive('1121', req.branchDb);
            } else if (newTransaccion.equivalencia >= 500) {
                // Asignar número de control para facturas mayores a $500
                newTransaccion.control = await concecutive('1100', req.branchDb);
            }
        }

        // ASIGNAR EL CAJERO
        newTransaccion.cajero = uid;
        newTransaccion.turno = user.turno._id;
        
        // SAVE
        await newTransaccion.save();

        // UPDATE INVENTORY (CON ROLLBACK SI FALLA)
        try {
            await updateInventoryAmount(newTransaccion, user.turno, req.branchDb);
        } catch (error) {
            console.error('Error al actualizar inventario, anulando transacción:', error);
            
            // EN LUGAR DE ELIMINAR, ANULAMOS LA FACTURA PARA NO PERDER EL CONSECUTIVO LOCALMENTE
            newTransaccion.status = false;
            newTransaccion.estado = 'Anulada por error del sistema (Rollback)';
            newTransaccion.fechaCancel = new Date();
            newTransaccion.userCancel = uid;
            newTransaccion.electronica = false; // Evita envíos accidentales a la DIAN
            await newTransaccion.save();

            return res.status(500).json({
                ok: false,
                msg: `Error crítico: La transacción no pudo ser guardada y fue anulada automáticamente. Por favor diríjase a la pestaña "Facturas", busque la factura anulada e imprímala para dejar constancia física de este error.`
            });
        }

        
        try {
            const transaccion = await Transaccion.findById(newTransaccion._id)
                .populate({ path: 'client', model: ClientCompany })
                .populate({ path: 'cajero', model: UserCompany })
                .populate({ path: 'declarant', model: ClientCompany })
                .populate({ path: 'items.moneda', model: Inventory });

            if (transaccion.electronica) {
                const conexusResponse = await enviarFacturaConexus(transaccion, req.branchDb);

                if (conexusResponse.ok && conexusResponse.data && conexusResponse.data.SetDocumentResult) {
                    const resultado = conexusResponse.data.SetDocumentResult;
                    if (resultado.CodResp !== 'ERR') {
                        transaccion.conexus = {
                            CodQR: resultado.CodQR,
                            Base64QR: resultado.Base64QR,
                            CodigoTransaccion: resultado.CodigoTransaccion,
                            FechaValidacion: resultado.FechaValidacion,
                            estado: resultado.DetalleRespuesta
                        };
                        await transaccion.save();
                    } else {
                        console.log("Factura rechazada por Conexus:", resultado.Detalles);
                    }
                } else {
                    transaccion.estado = 'Pendiente';
                    await transaccion.save();
                    console.log("Error al enviar la factura a Conexus:", conexusResponse.error || "Respuesta inesperada");
                }
            }

            return res.json({
                ok: true,
                transaccion,
                turno: user.turno
            });

        } catch (innerError) {
            console.error('Error crítico, ejecutando GHOST ROLLBACK:', innerError);
            try { await revertInventoryAmount(newTransaccion, user.turno, req.branchDb); } catch(e) { }

            await Transaccion.findByIdAndDelete(newTransaccion._id);

            const Concecutive = require('../models/concecutives.model')(req.branchDb);
            if (newTransaccion.number) {
                await Concecutive.findOneAndUpdate({ type: newTransaccion.transaccion }, { $inc: { seq: -1 } });
            }
            if (newTransaccion.control) {
                let controlType;
                if (newTransaccion.transaccion === 'Compra') {
                    if (newTransaccion.equivalencia > 200 && newTransaccion.equivalencia < 500) controlType = '1121';
                    else if (newTransaccion.equivalencia >= 500) controlType = '1099';
                } else if (newTransaccion.transaccion === 'Venta') {
                    if (newTransaccion.equivalencia > 200 && newTransaccion.equivalencia < 500) controlType = '1121';
                    else if (newTransaccion.equivalencia >= 500) controlType = '1100';
                }
                if (controlType) {
                    await Concecutive.findOneAndUpdate({ type: controlType }, { $inc: { seq: -1 } });
                }
            }

            return res.status(500).json({
                ok: false,
                msg: 'Error critico procesando la factura. El Ghost Rollback actuo por seguridad: ' + String(innerError.message || innerError)
            });
        }
    } catch (error) {
        console.error('OUTER ERROR in createTransaccion:', error);
        require('fs').writeFileSync('d:/PROYECTO DE SOFTWARE/SIMIDMAS/diviBackend/error_log_outer.txt', String(error.stack || error.message || error));
        return res.status(500).json({
            ok: false,
            msg: 'Error Inesperado. Intente nuevamente.'
        });
    }
};

/** =====================================================================
 *  UPDATE DEPARTMETN
=========================================================================*/
const importarTransaccionesBulk = async (req, res = response) => {
    try {
        if (!req.branchDb || !req.companyDb) return res.status(400).json({ ok: false, msg: 'Faltan contextos de base de datos' });
        const Transaccion = getTransaccionModel(req.branchDb);
        const Inventory = getInventoryModel(req.branchDb);
        const Client = getClientModel(req.companyDb);

        const { transacciones } = req.body;

        if (!transacciones || transacciones.length === 0) {
            return res.status(400).json({ ok: false, msg: 'No hay datos para importar.' });
        }

        // Extraer documentos y códigos únicos
        const documentosClientes = [...new Set(transacciones.map(t => String(t.clienteDoc)))];
        const codigosMonedas = [...new Set(transacciones.map(t => String(t.monedaCode)))];

        // BUSCAR EN BD Y CREAR DICCIONARIOS
        const clientesEncontrados = await Client.find({ numberid: { $in: documentosClientes } }, '_id numberid');
        const monedasEncontradas = await Inventory.find({ code: { $in: codigosMonedas } }, '_id code');

        const mapClientes = clientesEncontrados.reduce((acc, curr) => {
            acc[curr.numberid] = curr._id;
            return acc;
        }, {});

        const mapMonedas = monedasEncontradas.reduce((acc, curr) => {
            acc[curr.code] = curr._id;
            return acc;
        }, {});

        // PREPARAR OPERACIONES
        let operaciones = [];
        let facturasOmitidas = 0;

        for (const trx of transacciones) {
            
            const clienteId = mapClientes[trx.clienteDoc];
            const monedaId = mapMonedas[trx.monedaCode];

            // Si no existe el cliente o la moneda en la BD nueva, no podemos guardar la factura
            if (!clienteId || !monedaId) {
                if (!clienteId) console.log('Cliente no encontrado...')
                if (!monedaId) console.log('Moneda no encontrad...')
                facturasOmitidas++;
                continue; 
            }

            // AGREGAMOS EL ITEM
            const itemUnico = {
                moneda: monedaId,
                monto: trx.monto,
                tasa: trx.tasa,
                subtotal: trx.monto * trx.tasa,
                total: trx.total,
                iva: 0,
                pcda: trx.tasa,
                dift: 0,
                baseliq: trx.baseliq,
                tvb: trx.tasa,
                trm: trx.trm,
                equivalencia: trx.equivalencia 
            };

            const nuevaTransaccion = {
                transaccion: trx.transaccion,
                client: clienteId,
                declarant: clienteId,
                prefix: trx.prefix,
                number: trx.number,
                control: trx.control,
                total: trx.total,
                subtotal: trx.monto * trx.tasa,
                type: 'Contado',
                formaPago: 'Efectivo',
                equivalencia: trx.equivalencia,
                
                // Fechas
                fecha: new Date(trx.fecha),
                fechaC: trx.fechaC ? new Date(trx.fechaC) : null,
                
                // Banderas
                pnc: trx.pnc,
                electronica: false,
                status: true,
                
                // PAGO
                payments: [{
                    monto: trx.total,
                    type: 'Efectivo',
                    status: true,
                    fecha: new Date(trx.fecha)
                }],
                
                items: [itemUnico]
            };

            // ADD TRANSACCION
            operaciones.push({
                updateOne: {
                    filter: { prefix: trx.prefix, number: trx.number },
                    update: { $set: nuevaTransaccion },
                    upsert: true
                }
            });
        }

        // EJECUCION MASIVA
        if (operaciones.length > 0) {
            await Transaccion.bulkWrite(operaciones);
        }

        res.json({
            ok: true,
            msg: 'Importacion de transacciones agregadas exitosamente.',
            resumen: {
                importadas: operaciones.length,
                omitidas: facturasOmitidas,
                total: transacciones.length
            }
        });

    } catch (error) {
        console.error('Error migrando facturas:', error);
        res.status(500).json({ ok: false, msg: 'Error interno en la migración de facturas.' });
    }
};

/** =====================================================================
 *  UPDATE DEPARTMETN
=========================================================================*/
const updateTransaccion = async(req, res = response) => {


    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Transaccion = getTransaccionModel(req.branchDb);
        const tid = req.params.id;

        // SEARCH
        const transaccionDB = await Transaccion.findById(tid);
        if (!transaccionDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ninguna transaccion con este ID'
            });
        }
        // SEARCH

        const {...campos } = req.body;

        // UPDATE
        const transaccionUpdate = await Transaccion.findByIdAndUpdate(tid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            transaccion: transaccionUpdate
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }

};


/** =====================================================================
 *  RESEND CONEXUS
=========================================================================*/
const resendConexus = async(req, res = response) => {
    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Transaccion = getTransaccionModel(req.branchDb);
        const tid = req.params.id;  

        const ClientCompany = getClientModel(req.companyDb);
        const UserCompany = getUserModel(req.companyDb);

        const transaccionDB = await Transaccion.findById(tid)
            .populate({ path: 'client', model: ClientCompany })
            .populate({ path: 'cajero', model: UserCompany })
            .populate({ path: 'declarant', model: ClientCompany })
            .populate('items.moneda');

        if (!transaccionDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ninguna transaccion con este ID'
            });
        }

        if (transaccionDB.electronica && !transaccionDB.conexus) {

                // REENVIAR A CONEXUS
                const conexusResponse = await enviarFacturaConexus(transaccionDB, req.branchDb);

                if (conexusResponse.ok && conexusResponse.data && conexusResponse.data.SetDocumentResult) {
            
                    const resultado = conexusResponse.data.SetDocumentResult;

                    // Verificamos
                    if (resultado.CodResp !== 'ERR') {
                        
                        // Actualizamos
                        transaccionDB.conexus = {
                            CodQR: resultado.CodQR,
                            Base64QR: resultado.Base64QR,
                            CodigoTransaccion: resultado.CodigoTransaccion,
                            FechaValidacion: resultado.FechaValidacion,
                            estado: resultado.DetalleRespuesta
                        };

                        // Guardamos los nuevos datos en la base de datos
                        transaccionDB.estado = 'Enviada';
                        await transaccionDB.save();
                    } else {
                        console.log("Factura rechazada por Conexus:", resultado.Detalles);
                    }
                }else{
                    transaccionDB.estado = 'Pendiente';
                    await transaccionDB.save();
                    console.log("Error al enviar la factura a Conexus:", conexusResponse.error || "Respuesta inesperada");
                }

                res.json({
                    ok: true,
                    transaccion : transaccionDB
                });
            
        }else{
            return res.status(400).json({
                ok: false,
                msg: 'Esta transaccion ya se envio a la DIAN o no es electronica, no se puede reenviar.'
            });

        }

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }

}

/** =====================================================================
 *  CANCEL TRANSACCION
=========================================================================*/
const cancelTransaccion = async(req, res = response) => {
    try {
        if (!req.branchDb) return res.status(400).json({ ok: false, msg: 'Falta contexto sucursal' });
        const Transaccion = getTransaccionModel(req.branchDb);
        const User = getUserModel(req.branchDb);
        const Turno = getTurnoModel(req.branchDb);

        const tid = req.params.id;
        const uid = req.uid;

        const ClientCompany = getClientModel(req.companyDb);
        const UserCompany = getUserModel(req.companyDb);

        const userDB = await User.findById(uid).populate('turno');
        const transaccion = await Transaccion.findById(tid)
            .populate({ path: 'client', model: ClientCompany })
            .populate({ path: 'cajero', model: UserCompany })
            .populate({ path: 'declarant', model: ClientCompany })
            .populate('items.moneda');

        if (!transaccion) {
            return res.status(404).json({ ok: false, msg: 'No existe ninguna transaccion con este ID' });
        }

        if (!transaccion.status) {
            return res.status(400).json({ ok: false, msg: 'Esta transaccion ha sido cancelada previamente' });
        }

        if (!userDB || !userDB.turno || !userDB.turno.abierto) {
            return res.status(400).json({ ok: false, msg: 'Debes tener un turno abierto para anular una transacción' });
        }

        if (String(transaccion.turno) !== String(userDB.turno._id)) {
            return res.status(403).json({ 
                ok: false, 
                msg: 'No puedes anular esta factura directamente porque pertenece a un turno distinto o cerrado. Solicita una Nota de Crédito.' 
            });
        }
        
        const turnoActual = await Turno.findById(userDB.turno._id);
        
        
        await revertInventoryAmount(transaccion, turnoActual, req.branchDb);
        
        transaccion.status = false;
        transaccion.userCancel = uid;
        transaccion.fechaCancel = new Date();

        await transaccion.save();

        // ==============================================
        // SI LA FACTURA ES ELECTRÓNICA, GENERAR NOTA DE CRÉDITO Y ENVIARLA A CONEXUS
        // ==============================================
        if (transaccion.electronica && (!transaccion.conexus || !transaccion.conexus.CodigoTransaccion)) {
            return res.status(400).json({ ok: false, msg: 'Esta factura no tiene CUFE, no se puede generar Nota de Crédito.' });
        }

        // 3. Creas tu nueva transacción en base de datos tipo "NC"
        let devolucion = new Transaccion({
            transaccion: 'Nota de Credito',
            client: transaccion.client,
            prefix: 'NC',
            number: await concecutive('NC', req.branchDb), // Tu función de consecutivo
            total: transaccion.total,
            items: transaccion.items,
            // ... otros campos
            cajero: uid,
            total: transaccion.total,
            subtotal: transaccion.subtotal,
            equivalencia: transaccion.equivalencia,
            type: transaccion.type,
            electronica: true
        });
        await devolucion.save();

        // Haces los populates necesarios para la devolución...
        const devolucionPopulated = await Transaccion.findById(devolucion._id)
            .populate({ path: 'client', model: ClientCompany })
            .populate({ path: 'cajero', model: UserCompany })
            .populate({ path: 'declarant', model: ClientCompany })
            .populate('items.moneda');

        // 4. Invocas el helper pasándole AMBAS transacciones
        const conexusResponse = await enviarNotaCreditoConexus(devolucionPopulated, transaccion, req.branchDb);

        if (conexusResponse.ok && conexusResponse.data.SetDocumentResult.CodResp !== 'ERR') {
            // Guardas el nuevo CUFE (CUDE en este caso) de la Nota de Crédito
            devolucion.conexus = {
                CodQR: conexusResponse.data.SetDocumentResult.CodQR,
                Base64QR: conexusResponse.data.SetDocumentResult.Base64QR,
                CodigoTransaccion: conexusResponse.data.SetDocumentResult.CodigoTransaccion
            };
            await devolucion.save();

            transaccion.nc = devolucion._id;
            await transaccion.save();
        }


        res.json({
            ok: true,
            msg: 'Transacción anulada correctamente y saldos restaurados',
            transaccion,
            turno: turnoActual
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            // Si el helper lanzó un error personalizado (Ej: fondos insuficientes), lo mostramos
            msg: error.message || 'Error Inesperado al cancelar la transacción'
        });
    }
}



// EXPORTS
module.exports = {
    getTransaccionesQuery,
    getTransaccionesQueryGlobal,
    getTransaccionId,
    createTransaccion,
    updateTransaccion,
    cancelTransaccion,
    resendConexus,
    importarTransaccionesBulk
};