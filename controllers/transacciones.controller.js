const { response } = require('express');

const Transaccion = require('../models/transacciones.model');
const { concecutive } = require('../helpers/concecutive');
const { updateInventory } = require('./inventories.controller');

/** ======================================================================
 *  GET Transaccion
=========================================================================*/
const getTransaccionesQuery = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        const [transacciones, total] = await Promise.all([
            Transaccion.find(query)
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

        const transaccionDB = await Transaccion.findById(tid);
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

        let newTransaccion = new Transaccion(req.body);


        // VERIFICAR EL TIPO DE TRANSACCION
        if (newTransaccion.transaccion === 'Compra') {
            // OBTENER EL CONCECUTIVO DE LA COMPRA
            newTransaccion.number = await concecutive('Compra');

            // VALIDAR EL MONTO Y OBTENER EL CONCECUTIVO DEPENDIENDO DEL MONTO
            if (newTransaccion.monto > 200 && newTransaccion.monto < 500) {
                // Asignar número de control para facturas entre $200 y $500
                newTransaccion.control = await concecutive('1121');
            } else if (newTransaccion.monto >= 500) {
                // Asignar número de control para facturas mayores a $500
                newTransaccion.control = await concecutive('1099');
            }
        } else if (newTransaccion.transaccion === 'Venta') {
            // OBTENER EL CONCECUTIVO DE LA COMPRA
            newTransaccion.number = await concecutive('Venta');

            // VALIDAR EL MONTO Y OBTENER EL CONCECUTIVO DEPENDIENDO DEL MONTO
            if (newTransaccion.monto > 200 && newTransaccion.monto < 500) {
                // Asignar número de control para facturas entre $200 y $500
                newTransaccion.control = await concecutive('1121');
            } else if (newTransaccion.monto >= 500) {
                // Asignar número de control para facturas mayores a $500
                newTransaccion.control = await concecutive('1100');
            }
        }

        // ASIGNAR EL CAJERO
        newTransaccion.cajero = uid;

        // SAVE
        await newTransaccion.save();

        // UPDATE INVENTORY
        await updateInventory(newTransaccion);

        res.json({
            ok: true,
            transaccion: newTransaccion
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


// EXPORTS
module.exports = {
    getTransaccionesQuery,
    createTransaccion,
    updateTransaccion,
    getTransaccionId
};