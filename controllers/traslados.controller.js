const { response } = require('express');

const Traslado = require('../models/traslados.model');
const User = require('../models/users.model');

/** ======================================================================
 *  GET QUERY
=========================================================================*/
const getTrasladosQuery = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        const [traslados, total] = await Promise.all([
            Traslado.find(query)
            .populate('user')
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Traslado.countDocuments(query)
        ])

        res.json({
            ok: true,
            traslados,
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

/** ======================================================================
 *  GET QUERY CIERRES
=========================================================================*/
const getTrasladosCierre = async(req, res) => {

    try {

        const { turno } = req.body;

        const [trasladosEmitidos, trasladosRecibidos] = await Promise.all([
            Traslado.find({turnoEmisor: turno })
                .populate('emisor')
                .populate('receptor')
                .populate('monedaEntregada')
                .populate('monedaRecibida'),
            Traslado.find({turnoReceptor: turno })
                .populate('emisor')
                .populate('receptor')
                .populate('monedaEntregada')
                .populate('monedaRecibida')
        ])

        res.json({
            ok: true,
            trasladosEmitidos,
            trasladosRecibidos
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
 *  GET ID
=========================================================================*/
const getTrasladoId = async(req, res = response) => {

    try {
        const trasladoID = req.params.id;

        const trasladoDB = await Traslado.findById(trasladoID)
            .populate('user')
        if (!trasladoDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este traslado, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            traslado: trasladoDB
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
 *  CREATE
=========================================================================*/
const createTraslado = async (req, res = response) => {
    const uid = req.uid;

    try {
        
        const userDB = await User.findById(uid).populate('turno');
        if (!userDB) {
            return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
        }

        if (!userDB.turno?.abierto) {
            return res.status(400).json({
                ok: false,
                msg: 'Debes de abrir turno'
            });
        }

        const traslado = new Turno(req.body);

        traslado.save(),

        res.status(201).json({
            ok: true,
            traslado
        });

    } catch (error) {
        console.error('Error en createTraslado:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear el turno, hable con el administrador'
        });
    }
};

/** =====================================================================
 *  UPDATE
=========================================================================*/
const updateTraslado = async(req, res = response) => {

    const trasladoID = req.params.id;

    try {

        // SEARCH
        const trasladoDB = await Traslado.findById(trasladoID);
        if (!trasladoDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun traslado con este ID'
            });
        }
        // SEARCH

        // VALIDATE
        const {...campos } = req.body;

        // UPDATE
        const trasladoUpdate = await Traslado.findByIdAndUpdate(trasladoID, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            traslado: trasladoUpdate
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
    getTrasladosQuery,
    createTraslado,
    updateTraslado,
    getTrasladoId,
    getTrasladosCierre
};