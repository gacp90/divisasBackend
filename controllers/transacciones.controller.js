const { response } = require('express');

const Transaccion = require('../models/transacciones.model');
const Inventory= require('../models/inventory.model');
const User = require('../models/users.model');
const Turno = require('../models/turnos.model');


const { concecutive } = require('../helpers/concecutive');
const { updateInventoryAmount, revertInventoryAmount } = require('../helpers/update-inventory');

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
 *  CANCEL TRANSACCION
=========================================================================*/
const cancelTransaccion = async(req, res = response) => {
    try {
        const tid = req.params.id;
        const uid = req.uid;

        const userDB = await User.findById(uid).populate('turno');
        const transaccion = await Transaccion.findById(tid);

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
    cancelTransaccion
};