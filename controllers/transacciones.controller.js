const { response } = require('express');

const Transaccion = require('../models/transacciones.model');
const Inventory= require('../models/inventory.model');
const User = require('../models/users.model');
const Turno = require('../models/turnos.model');
const Client = require('../models/clients.model');


const { concecutive } = require('../helpers/concecutive');
const { updateInventoryAmount, revertInventoryAmount } = require('../helpers/update-inventory');
const { enviarFacturaConexus, enviarNotaCreditoConexus } = require('../helpers/conexus');

/** ======================================================================
 *  GET Transaccion
=========================================================================*/
const getTransaccionesQuery = async(req, res = response) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        const [transacciones, total] = await Promise.all([
            Transaccion.find(query)
            .populate({
                path: 'client',
                populate: {
                    path: 'representante'
                }
            })
            .populate('cajero')
            .populate('declarant')
            .populate('userCancel')
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
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });

    }
};

/** =====================================================================
 *  GET Transaccion ID
=========================================================================*/
const getTransaccionId = async(req, res = response) => {

    try {
        const tid = req.params.id;

        const transaccionDB = await Transaccion.findById(tid)
            .populate('client')
            .populate('cajero')
            .populate('declarant')
            .populate('userCancel')
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

        if (!user.turno) {
            return res.status(400).json({
                ok: false,
                msg: 'No has abierto turno.'
            });
        }
        
        let newTransaccion = new Transaccion(req.body);
        
        // VERIFICAR EL TIPO DE TRANSACCION
        if (newTransaccion.transaccion === 'Compra') {

            // VERIFICAR SI HAY SALDO
            const inventory = await Inventory.findOne({code: 'COP'});
            if (inventory.amount < newTransaccion.total) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Lo sentimos, no tienes el saldo suficiente para realizar esta transacción.'
                });                
            }

            // OBTENER EL CONCECUTIVO DE LA COMPRA
            newTransaccion.number = await concecutive('Compra');

            // VALIDAR EL MONTO Y OBTENER EL CONCECUTIVO DEPENDIENDO DEL MONTO
            if (newTransaccion.equivalencia > 200 && newTransaccion.equivalencia < 500) {
                // Asignar número de control para facturas entre $200 y $500
                newTransaccion.control = await concecutive('1121');
            } else if (newTransaccion.equivalencia >= 500) {
                // Asignar número de control para facturas mayores a $500
                newTransaccion.control = await concecutive('1099');
            }
        } else if (newTransaccion.transaccion === 'Venta') {
            // OBTENER EL CONCECUTIVO DE LA COMPRA
            newTransaccion.number = await concecutive('Venta');

            // VALIDAR EL MONTO Y OBTENER EL CONCECUTIVO DEPENDIENDO DEL MONTO
            if (newTransaccion.equivalencia > 200 && newTransaccion.equivalencia < 500) {
                // Asignar número de control para facturas entre $200 y $500
                newTransaccion.control = await concecutive('1121');
            } else if (newTransaccion.equivalencia >= 500) {
                // Asignar número de control para facturas mayores a $500
                newTransaccion.control = await concecutive('1100');
            }
        }

        // ASIGNAR EL CAJERO
        newTransaccion.cajero = uid;
        newTransaccion.turno = user.turno._id;
        
        // SAVE
        await newTransaccion.save();

        // UPDATE INVENTORY
        await updateInventoryAmount(newTransaccion, user.turno);

        const transaccion = await Transaccion.findById(newTransaccion._id)
            .populate('client')
            .populate('cajero')
            .populate('declarant')
            .populate('items.moneda');

        // ==============================================
        // ENVIAR A CONEXUS
        // ==============================================
        if (transaccion.electronica) {
            const conexusResponse = await enviarFacturaConexus(transaccion);

            if (conexusResponse.ok && conexusResponse.data && conexusResponse.data.SetDocumentResult) {
            
                const resultado = conexusResponse.data.SetDocumentResult;

                // Verificamos
                if (resultado.CodResp !== 'ERR') {
                    
                    // Actualizamos
                    transaccion.conexus = {
                        CodQR: resultado.CodQR,
                        Base64QR: resultado.Base64QR,
                        CodigoTransaccion: resultado.CodigoTransaccion,
                        FechaValidacion: resultado.FechaValidacion,
                        estado: resultado.DetalleRespuesta
                    };

                    // Guardamos los nuevos datos en la base de datos
                    await transaccion.save();
                } else {
                    console.log("Factura rechazada por Conexus:", resultado.Detalles);
                }
            }else{
                transaccion.estado = 'Pendiente';
                await transaccion.save();
                console.log("Error al enviar la factura a Conexus:", conexusResponse.error || "Respuesta inesperada");
            }
            
        }

        res.json({
            ok: true,
            transaccion,
            turno: user.turno
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
 *  UPDATE DEPARTMETN
=========================================================================*/
const importarTransaccionesBulk = async (req, res = response) => {
    try {
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
        const tid = req.params.id;  

        const transaccionDB = await Transaccion.findById(tid)
            .populate('client')
            .populate('cajero')
            .populate('declarant')
            .populate('items.moneda');

        if (!transaccionDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ninguna transaccion con este ID'
            });
        }

        if (transaccionDB.electronica && !transaccionDB.conexus) {

                // REENVIAR A CONEXUS
                const conexusResponse = await enviarFacturaConexus(transaccionDB);

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
        const tid = req.params.id;
        const uid = req.uid;

        const userDB = await User.findById(uid).populate('turno');
        const transaccion = await Transaccion.findById(tid)
            .populate('client')
            .populate('cajero')
            .populate('declarant')
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
        
        
        await revertInventoryAmount(transaccion, turnoActual);
        
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
            number: await concecutive('NC'), // Tu función de consecutivo
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
            .populate('client')
            .populate('cajero')
            .populate('declarant')
            .populate('items.moneda');

        // 4. Invocas el helper pasándole AMBAS transacciones
        const conexusResponse = await enviarNotaCreditoConexus(devolucionPopulated, transaccion);

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
    createTransaccion,
    updateTransaccion,
    getTransaccionId,
    cancelTransaccion,
    resendConexus,
    importarTransaccionesBulk
};