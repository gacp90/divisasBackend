const { response } = require('express');

const Movimiento = require('../models/movimientos.model');

/** ======================================================================
 *  GET MOVIMIENTOS
=========================================================================*/
const getMovimientosQuery = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        const [movimientos, total] = await Promise.all([
            Movimiento.find(query)
            .populate('user')
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Movimiento.countDocuments(query)
        ])

        res.json({
            ok: true,
            movimientos,
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
 *  GET MOVIMIENTO ID
=========================================================================*/
const getMovimientoId = async(req, res = response) => {

    try {
        const movid = req.params.id;

        const movimientoDB = await Movimiento.findById(movid)
            .populate('user')
        if (!movimientoDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este movimiento, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            movimiento: movimientoDB
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
 *  CREATE MOVIMIENTO
=========================================================================*/
const createMovimiento = async(req, res = response) => {


    try {

        const movimiento = new Movimiento(req.body);

        // SAVE
        await movimiento.save();

        res.json({
            ok: true,
            movimiento
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
 *  UPDATE MOVIMIENTO
=========================================================================*/
const updateMovimiento = async(req, res = response) => {

    const movid = req.params.id;

    try {

        // SEARCH
        const movimientoDB = await Movimiento.findById(movid);
        if (!movimientoDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun movimiento con este ID'
            });
        }
        // SEARCH

        // VALIDATE
        const {...campos } = req.body;

        // UPDATE
        const movimientoUpdate = await Movimiento.findByIdAndUpdate(movid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            movimiento: movimientoUpdate
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
    getMovimientosQuery,
    createMovimiento,
    updateMovimiento,
    getMovimientoId
};